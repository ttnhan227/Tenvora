using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Tenvora.Api.Common;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;
using Tenvora.Api.Localization;
using Tenvora.Api.Middleware;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class ProductsAdjustmentsHttpTests
{
    private const string TestJwtSecret = "tenvora-http-integration-test-jwt-secret-key-at-least-32-bytes";

    private sealed class TestHost : IAsyncDisposable
    {
        public WebApplication App { get; }
        public HttpClient Client { get; }
        public TokenService Tokens { get; }

        private TestHost(WebApplication app, HttpClient client, TokenService tokens)
        {
            App = app;
            Client = client;
            Tokens = tokens;
        }

        public static async Task<TestHost> CreateAsync(string? postgresConnectionString = null)
        {
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseUrls("http://127.0.0.1:0");

            builder.Services.AddLocalization();
            builder.Services.AddSingleton<IAppLocalizer, AppLocalizer>();
            builder.Services.AddControllers(options => options.Filters.Add<WorkflowExceptionFilter>())
                .AddApplicationPart(typeof(ProductsController).Assembly);
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                    new BadRequestObjectResult(ApiResult.Fail(
                        context.ModelState.Values.SelectMany(v => v.Errors).Select(e =>
                            string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Check the submitted details." : e.ErrorMessage).ToList()));
            });

            builder.Services.AddRateLimiter(options =>
            {
                options.AddPolicy("payments-rate-limit", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "test-client",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 120,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            });

            var jwtSettings = new JwtSettings
            {
                Issuer = "Tenvora",
                Audience = "Tenvora",
                Secret = TestJwtSecret,
                AccessTokenMinutes = 60
            };
            builder.Services.AddSingleton(Options.Create(jwtSettings));
            builder.Services.AddSingleton<TokenService>();

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings.Issuer,
                        ValidAudience = jwtSettings.Audience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                        ClockSkew = TimeSpan.Zero
                    };
                });

            builder.Services.AddAuthorization();

            if (!string.IsNullOrWhiteSpace(postgresConnectionString))
            {
                builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(postgresConnectionString));
            }
            else
            {
                var dbName = $"tenvora_http_test_{Guid.NewGuid():N}";
                builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(dbName));
            }

            builder.Services.AddScoped<IBusinessService, BusinessService>();

            var app = builder.Build();
            app.UseAuthentication();
            app.UseRateLimiter();
            if (!string.IsNullOrWhiteSpace(postgresConnectionString))
            {
                app.UseTenantContext();
            }
            app.UseAuthorization();
            app.MapControllers();

            await app.StartAsync();
            var client = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };
            var tokens = app.Services.GetRequiredService<TokenService>();
            return new TestHost(app, client, tokens);
        }

        public AppDbContext CreateDbContext()
        {
            var scope = App.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await App.DisposeAsync();
        }
    }

    private static async Task<(Guid TenantId, User Admin, User Manager, User ReadOnlyUser, Guid ProductId)> SeedTenantAsync(
        AppDbContext db,
        decimal initialStock = 10m)
    {
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "HTTP Adjustment Co",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            PlanType = "Business",
            Status = "Active"
        });

        var admin = new User { Id = Guid.NewGuid(), TenantId = tenantId, Email = $"admin-{tenantId:N}@example.test", PasswordHash = "hash", Role = "TenantAdmin", IsActive = true };
        var manager = new User { Id = Guid.NewGuid(), TenantId = tenantId, Email = $"mgr-{tenantId:N}@example.test", PasswordHash = "hash", Role = "OperationsManager", IsActive = true };
        var readOnly = new User { Id = Guid.NewGuid(), TenantId = tenantId, Email = $"ro-{tenantId:N}@example.test", PasswordHash = "hash", Role = "ReadOnly", IsActive = true };
        db.Users.AddRange(admin, manager, readOnly);
        await db.SaveChangesAsync();

        var createdProduct = await new BusinessService(db).CreateProductAsync(
            tenantId,
            new("Widget A", "WID-A", "pcs", 25_000m, null, StockQuantity: initialStock, TrackInventory: true));
        Assert.True(createdProduct.Success, createdProduct.Message);

        return (tenantId, admin, manager, readOnly, createdProduct.Data!.Id);
    }

    private static HttpRequestMessage PostAdjustmentRequest(
        Guid productId,
        decimal quantity,
        string reason,
        string? token = null,
        string? idempotencyKey = null,
        string? notes = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/products/adjustments")
        {
            Content = JsonContent.Create(new CreateStockAdjustmentRequest(productId, quantity, reason, notes))
        };
        if (token != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        if (idempotencyKey != null)
        {
            request.Headers.Add("Idempotency-Key", idempotencyKey);
        }
        return request;
    }

    [Fact]
    public async Task PostAdjustments_EnforcesAuthenticationAndRoleAuthorization()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var host = await TestHost.CreateAsync();
        await using var db = host.CreateDbContext();
        var (_, admin, manager, readOnly, productId) = await SeedTenantAsync(db, initialStock: 10m);

        // Unauthenticated -> 401
        using (var anonResp = await host.Client.SendAsync(PostAdjustmentRequest(productId, -2m, "damaged"), ct))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, anonResp.StatusCode);
        }

        // ReadOnly -> 403
        var readOnlyToken = host.Tokens.CreateAccessToken(readOnly);
        using (var roResp = await host.Client.SendAsync(PostAdjustmentRequest(productId, -2m, "damaged", readOnlyToken, "ro-key-1"), ct))
        {
            Assert.Equal(HttpStatusCode.Forbidden, roResp.StatusCode);
        }

        // OperationsManager -> 200
        var managerToken = host.Tokens.CreateAccessToken(manager);
        using (var mgrResp = await host.Client.SendAsync(PostAdjustmentRequest(productId, -2m, "damaged", managerToken, "mgr-key-1", "broken box"), ct))
        {
            Assert.Equal(HttpStatusCode.OK, mgrResp.StatusCode);
            var body = await mgrResp.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.NotNull(body);
            Assert.True(body.Success, body.Message);
            Assert.NotNull(body.Data);
            Assert.Equal(10m, body.Data.QuantityBefore);
            Assert.Equal(-2m, body.Data.AdjustmentQuantity);
            Assert.Equal(8m, body.Data.QuantityAfter);
            Assert.Equal(manager.Id, body.Data.UserId);
            Assert.Equal("damaged", body.Data.Reason);
        }

        // TenantAdmin -> 200
        var adminToken = host.Tokens.CreateAccessToken(admin);
        using (var adminResp = await host.Client.SendAsync(PostAdjustmentRequest(productId, 5m, "physical_count", adminToken, "adm-key-1"), ct))
        {
            Assert.Equal(HttpStatusCode.OK, adminResp.StatusCode);
            var body = await adminResp.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.NotNull(body);
            Assert.True(body.Success, body.Message);
            Assert.Equal(13m, body.Data!.QuantityAfter);
            Assert.Equal(admin.Id, body.Data.UserId);
        }

        // Verify persisted state via GET /api/products/adjustments
        using var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/products/adjustments?productId={productId}");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        using var getResp = await host.Client.SendAsync(getReq, ct);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var list = await getResp.Content.ReadFromJsonAsync<ApiResult<List<StockAdjustmentDto>>>(cancellationToken: ct);
        Assert.NotNull(list?.Data);
        Assert.Equal(2, list.Data.Count);
    }

    [Fact]
    public async Task PostAdjustments_EnforcesIdempotencyAndRejectsNegativeStockAndCrossTenantAccess()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var host = await TestHost.CreateAsync();
        await using var db = host.CreateDbContext();
        var (tenantA, adminA, _, _, productA) = await SeedTenantAsync(db, initialStock: 5m);
        var (_, adminB, _, _, _) = await SeedTenantAsync(db, initialStock: 20m);

        var tokenA = host.Tokens.CreateAccessToken(adminA);
        var tokenB = host.Tokens.CreateAccessToken(adminB);

        // Idempotent replay with identical key + body applies stock change only once
        Guid firstId;
        using (var first = await host.Client.SendAsync(PostAdjustmentRequest(productA, -2m, "damaged", tokenA, "idem-adj-1", "wet"), ct))
        {
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
            var body = await first.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.True(body!.Success);
            firstId = body.Data!.Id;
        }

        using (var replay = await host.Client.SendAsync(PostAdjustmentRequest(productA, -2m, "damaged", tokenA, "idem-adj-1", "wet"), ct))
        {
            Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
            var body = await replay.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.True(body!.Success);
            Assert.Equal(firstId, body.Data!.Id);
            Assert.Equal(3m, body.Data.QuantityAfter);
        }

        // Reusing same key with different payload -> 409 Conflict
        using (var conflict = await host.Client.SendAsync(PostAdjustmentRequest(productA, -1m, "damaged", tokenA, "idem-adj-1", "wet"), ct))
        {
            Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
            var body = await conflict.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.False(body!.Success);
        }

        // Negative resulting stock -> 400
        using (var negative = await host.Client.SendAsync(PostAdjustmentRequest(productA, -4m, "damaged", tokenA, "idem-neg-1"), ct))
        {
            Assert.Equal(HttpStatusCode.BadRequest, negative.StatusCode);
            var body = await negative.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.False(body!.Success);
            Assert.Contains("negative", body.Message, StringComparison.OrdinalIgnoreCase);
        }

        // Cross-tenant product access -> 404
        using (var crossTenant = await host.Client.SendAsync(PostAdjustmentRequest(productA, -1m, "damaged", tokenB, "idem-cross-1"), ct))
        {
            Assert.Equal(HttpStatusCode.NotFound, crossTenant.StatusCode);
        }

        await using var verifyDb = host.CreateDbContext();
        var storedProduct = await verifyDb.Products.AsNoTracking().SingleAsync(p => p.TenantId == tenantA && p.Id == productA, ct);
        Assert.Equal(3m, storedProduct.StockQuantity);
        Assert.Equal(1, await verifyDb.StockAdjustments.CountAsync(a => a.TenantId == tenantA && a.ProductId == productA, ct));
    }

    [Fact]
    public async Task PostAdjustments_ValidatesRequiredFieldsAndOptionalIdempotencyHeader()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var host = await TestHost.CreateAsync();
        await using var db = host.CreateDbContext();
        var (_, admin, _, _, productId) = await SeedTenantAsync(db, initialStock: 10m);
        var token = host.Tokens.CreateAccessToken(admin);

        // Missing Reason fails [Required] model validation -> 400
        using (var invalid = await host.Client.SendAsync(PostAdjustmentRequest(productId, -1m, "", token, "idem-empty-reason"), ct))
        {
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        }

        // Omitting Idempotency-Key header still succeeds (nullable parameter)
        using (var noHeader = await host.Client.SendAsync(PostAdjustmentRequest(productId, 4m, "restock", token, idempotencyKey: null), ct))
        {
            Assert.Equal(HttpStatusCode.OK, noHeader.StatusCode);
            var body = await noHeader.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.True(body!.Success, body.Message);
            Assert.Equal(14m, body.Data!.QuantityAfter);
        }
    }

    [PostgresFact]
    public async Task PostAdjustments_PostgreSql_EnforcesRlsAndConstraintsEndToEnd()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var database = new PostgresWorkflowTests.Database();
        await database.Initialize();

        await using var host = await TestHost.CreateAsync(database.ConnectionString);
        Guid productA;
        User adminA;
        User adminB;
        await using (var seedDb = host.CreateDbContext())
        {
            (_, adminA, _, _, productA) = await SeedTenantAsync(seedDb, initialStock: 6m);
            (_, adminB, _, _, _) = await SeedTenantAsync(seedDb, initialStock: 6m);
        }

        var tokenA = host.Tokens.CreateAccessToken(adminA);
        var tokenB = host.Tokens.CreateAccessToken(adminB);

        using (var ok = await host.Client.SendAsync(PostAdjustmentRequest(productA, -2m, "damaged", tokenA, "pg-adj-1"), ct))
        {
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
            var body = await ok.Content.ReadFromJsonAsync<ApiResult<StockAdjustmentDto>>(cancellationToken: ct);
            Assert.True(body!.Success, body.Message);
            Assert.Equal(4m, body.Data!.QuantityAfter);
        }

        using (var cross = await host.Client.SendAsync(PostAdjustmentRequest(productA, -1m, "damaged", tokenB, "pg-adj-cross"), ct))
        {
            Assert.Equal(HttpStatusCode.NotFound, cross.StatusCode);
        }

        using (var neg = await host.Client.SendAsync(PostAdjustmentRequest(productA, -5m, "damaged", tokenA, "pg-adj-neg"), ct))
        {
            Assert.Equal(HttpStatusCode.BadRequest, neg.StatusCode);
        }
    }
}
