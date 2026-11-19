using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

public sealed class AiAssistantUndoHttpTests
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
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI_PROVIDER_API_KEY"] = ""
            });

            builder.Services.AddLocalization();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddHttpClient();
            builder.Services.AddSingleton<IAppLocalizer, AppLocalizer>();
            builder.Services.AddControllers(options => options.Filters.Add<WorkflowExceptionFilter>())
                .AddApplicationPart(typeof(AiAssistantController).Assembly);
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                    new BadRequestObjectResult(ApiResult.Fail(
                        context.ModelState.Values.SelectMany(v => v.Errors).Select(e =>
                            string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Check the submitted details." : e.ErrorMessage).ToList()));
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
                var dbName = $"tenvora_ai_undo_http_{Guid.NewGuid():N}";
                builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(dbName));
            }

            builder.Services.AddScoped<IBusinessService, BusinessService>();
            builder.Services.AddScoped<IAiAssistantService, AiAssistantService>();
            builder.Services.AddScoped<IAiActionService, AiActionService>();
            builder.Services.AddScoped<IAiAgentService, AiAgentService>();

            var app = builder.Build();
            app.UseAuthentication();
            if (!string.IsNullOrWhiteSpace(postgresConnectionString))
            {
                app.UseTenantContext();
            }
            app.UseAuthorization();
            app.MapControllers();

            await app.StartAsync(TestContext.Current.CancellationToken);
            var client = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };
            var tokens = app.Services.GetRequiredService<TokenService>();
            return new TestHost(app, client, tokens);
        }

        public AppDbContext CreateDbContext() => App.Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>();

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await App.DisposeAsync();
        }
    }

    private static HttpRequestMessage PostUndoRequest(Guid actionId, string? bearerToken)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/ai/assistant/actions/{actionId}/undo");
        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }
        return req;
    }

    [Fact]
    public async Task PostUndo_EnforcesAuthAndReversesExecutedSale_AndRejectsUnsupportedOrExpiredActions()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var host = await TestHost.CreateAsync();

        Guid tenantId = Guid.NewGuid();
        User admin;
        User readOnlyUser;
        Guid executedSaleActionId;
        Guid unsupportedSettingsActionId;
        Guid expiredActionId;
        Guid saleId;

        using (var scope = host.App.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var business = scope.ServiceProvider.GetRequiredService<IBusinessService>();
            var actions = scope.ServiceProvider.GetRequiredService<IAiActionService>();

            admin = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Email = "admin@tenvora.test",
                Role = "TenantAdmin",
                IsActive = true,
                PreferredCurrency = "USD"
            };
            readOnlyUser = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Email = "viewer@tenvora.test",
                Role = "ReadOnly",
                IsActive = true,
                PreferredCurrency = "USD"
            };
            db.Tenants.Add(new Tenant
            {
                Id = tenantId,
                CompanyName = "Undo Co",
                ApiKey = Guid.NewGuid().ToString("N"),
                BaseCurrency = "USD",
                PlanType = "Business",
                Status = "Active"
            });
            db.Users.AddRange(admin, readOnlyUser);
            await db.SaveChangesAsync(ct);

            var customer = (await business.CreateCustomerAsync(tenantId, new("Buyer Co", null, null, null, null))).Data!;
            var product = (await business.CreateProductAsync(tenantId, new("Widget", null, "unit", 25m, CostPrice: 10m, StockQuantity: 10m, MinStockLevel: 1m, TrackInventory: true))).Data!;
            var saleAction = new AiAction
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = admin.Id,
                Intent = "sale",
                RiskLevel = "Medium",
                Status = AiActionStatuses.PendingConfirmation,
                RequiresConfirmation = true,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                SourceText = "Sold 2 Widgets to Buyer Co",
                IdempotencyKey = "http-undo-sale-1",
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    CustomerId = customer.Id,
                    ProductId = product.Id,
                    Quantity = 2m,
                    UnitPrice = 25m,
                    PaidAmount = 0m
                })
            };
            db.AiActions.Add(saleAction);
            await db.SaveChangesAsync(ct);

            var confirm = await actions.ConfirmAsync(tenantId, admin.Id, saleAction.Id, true, ct: ct);
            Assert.True(confirm.Success, confirm.Message);
            executedSaleActionId = saleAction.Id;
            saleId = confirm.Data!.RecordId!.Value;

            unsupportedSettingsActionId = Guid.NewGuid();
            expiredActionId = Guid.NewGuid();
            db.AiActions.AddRange(
                new AiAction
                {
                    Id = unsupportedSettingsActionId,
                    TenantId = tenantId,
                    UserId = admin.Id,
                    Intent = "update_settings",
                    RiskLevel = "Medium",
                    Status = AiActionStatuses.Executed,
                    SourceText = "Switch currency",
                    IdempotencyKey = "http-undo-settings",
                    PayloadJson = "{}",
                    AffectedEntityType = "Tenant",
                    AffectedEntityId = tenantId,
                    ExecutedAt = DateTime.UtcNow
                },
                new AiAction
                {
                    Id = expiredActionId,
                    TenantId = tenantId,
                    UserId = admin.Id,
                    Intent = "sale",
                    RiskLevel = "Medium",
                    Status = AiActionStatuses.Executed,
                    SourceText = "Old sale",
                    IdempotencyKey = "http-undo-expired",
                    PayloadJson = "{}",
                    AffectedEntityType = "Sale",
                    AffectedEntityId = saleId,
                    ExecutedAt = DateTime.UtcNow.AddMinutes(-20)
                });
            await db.SaveChangesAsync(ct);
        }

        var adminToken = host.Tokens.CreateAccessToken(admin);
        var viewerToken = host.Tokens.CreateAccessToken(readOnlyUser);

        // 1. Unauthenticated -> 401
        using (var unauth = await host.Client.SendAsync(PostUndoRequest(executedSaleActionId, null), ct))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, unauth.StatusCode);
        }

        // 2. ReadOnly -> 403
        using (var forbidden = await host.Client.SendAsync(PostUndoRequest(executedSaleActionId, viewerToken), ct))
        {
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        }

        // 3. Unsupported Tenant settings undo -> 400
        using (var unsupported = await host.Client.SendAsync(PostUndoRequest(unsupportedSettingsActionId, adminToken), ct))
        {
            Assert.Equal(HttpStatusCode.BadRequest, unsupported.StatusCode);
        }

        // 4. Expired window undo -> 400
        using (var expired = await host.Client.SendAsync(PostUndoRequest(expiredActionId, adminToken), ct))
        {
            Assert.Equal(HttpStatusCode.BadRequest, expired.StatusCode);
        }

        // 5. Valid executed sale undo -> 200 & Undone & sale voided
        using (var ok = await host.Client.SendAsync(PostUndoRequest(executedSaleActionId, adminToken), ct))
        {
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
            var body = await ok.Content.ReadFromJsonAsync<ApiResult<AiActionExecutionResponse>>(cancellationToken: ct);
            Assert.True(body!.Success, body.Message);
            Assert.Equal(AiActionStatuses.Undone, body.Data!.Status);
        }

        await using var verifyDb = host.CreateDbContext();
        var sale = await verifyDb.Sales.FirstAsync(s => s.Id == saleId, ct);
        Assert.Equal("Voided", sale.Status);
    }

    [PostgresFact]
    public async Task PostUndo_PostgreSql_AllowsUndoneStatusWithoutCheckViolation()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var database = new PostgresWorkflowTests.Database();
        await database.Initialize();
        await using var host = await TestHost.CreateAsync(database.ConnectionString);

        Guid tenantId = Guid.NewGuid();
        User admin;
        Guid paymentActionId;
        Guid paymentId;

        using (var scope = host.App.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var business = scope.ServiceProvider.GetRequiredService<IBusinessService>();
            var actions = scope.ServiceProvider.GetRequiredService<IAiActionService>();

            admin = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Email = "pg-undo@tenvora.test",
                Role = "TenantAdmin",
                IsActive = true,
                PreferredCurrency = "USD"
            };
            db.Tenants.Add(new Tenant
            {
                Id = tenantId,
                CompanyName = "PG Undo Co",
                ApiKey = Guid.NewGuid().ToString("N"),
                BaseCurrency = "USD",
                PlanType = "Business",
                Status = "Active"
            });
            db.Users.Add(admin);
            await db.SaveChangesAsync(ct);

            var customer = (await business.CreateCustomerAsync(tenantId, new("PG Buyer", null, null, null, null))).Data!;
            var product = (await business.CreateProductAsync(tenantId, new("PG Item", null, "unit", 50m, CostPrice: 10m, StockQuantity: 10m, MinStockLevel: 1m, TrackInventory: true))).Data!;
            var sale = (await business.CreateSaleAsync(tenantId, "pg-sale-1",
                new(customer.Id, [new(product.Id, 1m, 50m)], 0m))).Data!;
            var action = new AiAction
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = admin.Id,
                Intent = "debt_payment",
                RiskLevel = "Medium",
                Status = AiActionStatuses.PendingConfirmation,
                RequiresConfirmation = true,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                SourceText = "PG Buyer paid 20",
                IdempotencyKey = "pg-undo-pay-1",
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    CustomerId = customer.Id,
                    SaleId = sale.Id,
                    Amount = 20m
                })
            };
            db.AiActions.Add(action);
            await db.SaveChangesAsync(ct);

            var confirm = await actions.ConfirmAsync(tenantId, admin.Id, action.Id, true, ct: ct);
            Assert.True(confirm.Success, confirm.Message);
            paymentActionId = action.Id;
            paymentId = confirm.Data!.RecordId!.Value;
        }

        var token = host.Tokens.CreateAccessToken(admin);
        using var resp = await host.Client.SendAsync(PostUndoRequest(paymentActionId, token), ct);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        await using var verifyDb = host.CreateDbContext();
        var savedAction = await verifyDb.AiActions.FirstAsync(a => a.Id == paymentActionId, ct);
        var savedPayment = await verifyDb.BusinessPayments.FirstAsync(p => p.Id == paymentId, ct);
        Assert.Equal(AiActionStatuses.Undone, savedAction.Status);
        Assert.True(savedPayment.IsReversed);
    }
}
