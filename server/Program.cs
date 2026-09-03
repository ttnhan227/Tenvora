using System.IO;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Threading.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Middleware;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;

// 1. Auto-load root or local .env file (Unified single .env for local dev and Docker)
void LoadEnvFile(string path)
{
    if (!File.Exists(path)) return;
    foreach (var line in File.ReadAllLines(path))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
        var separatorIdx = trimmed.IndexOf('=');
        if (separatorIdx <= 0) continue;
        var key = trimmed[..separatorIdx].Trim();
        var val = trimmed[(separatorIdx + 1)..].Trim().Trim('"', '\'');
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, val);
        }
    }
}

LoadEnvFile(".env");
LoadEnvFile("../.env");
LoadEnvFile("../../.env");

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddControllers();

// Rate limiting for sensitive financial and auth endpoints
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("auth-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 1000,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("payments-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 2000,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientApp", policy =>
    {
        var origins = new List<string>
        {
            "http://localhost:5173",
            "https://localhost:5173",
            "http://localhost:4173",
            "https://localhost:4173",
            "http://localhost:80",
            "http://localhost:3000"
        };

        var extraOrigins = Environment.GetEnvironmentVariable("CLIENT_ORIGINS");
        if (!string.IsNullOrWhiteSpace(extraOrigins))
        {
            origins.AddRange(
                extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }

        policy.WithOrigins(origins.Distinct(StringComparer.OrdinalIgnoreCase).ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Tenvora Operations & Transaction API",
        Version = "v1",
        Description = "Interactive API documentation for enterprise B2B transaction processing, double-entry ledger, batch settlement, and automated reconciliation."
    });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a valid JWT bearer token.",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, jwtSecurityScheme);
    options.OperationFilter<AuthorizeCheckOperationFilter>();
    options.DocumentFilter<SwaggerTagDescriptionsDocumentFilter>();
    options.OperationFilter<SwaggerExamplesOperationFilter>();
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.AddSingleton<TokenService>();

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<ILedgerRepository, LedgerRepository>();
builder.Services.AddScoped<IPaymentRequestRepository, PaymentRequestRepository>();
builder.Services.AddScoped<IIdempotencyRepository, IdempotencyRepository>();
builder.Services.AddScoped<ISettlementRepository, SettlementRepository>();
builder.Services.AddScoped<IReconciliationRepository, ReconciliationRepository>();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ITransferService, TransferService>();
builder.Services.AddScoped<ILedgerService, LedgerService>();
builder.Services.AddScoped<ISettlementService, SettlementService>();
builder.Services.AddScoped<IReconciliationService, ReconciliationService>();
builder.Services.AddScoped<IRiskService, RiskService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IIntelligenceService, IntelligenceService>();
builder.Services.AddHostedService<IntelligenceBackgroundSyncService>();
builder.Services.AddSingleton<IBackgroundTaskQueue>(_ => new BackgroundTaskQueue(1000));
builder.Services.AddHostedService<QueuedHostedService>();

var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("No database connection string found.");

if (connectionString.StartsWith("postgresql://") || connectionString.StartsWith("postgres://"))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<AuditLogSaveChangesInterceptor>();

builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseNpgsql(connectionString)
           .AddInterceptors(sp.GetRequiredService<AuditLogSaveChangesInterceptor>())
           .AddInterceptors(new EntityValidationInterceptor()));

var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>() ?? new JwtSettings();
var secretFromEnv = Environment.GetEnvironmentVariable("JWT_SECRET") 
    ?? Environment.GetEnvironmentVariable("JwtSettings__Secret");
if (!string.IsNullOrWhiteSpace(secretFromEnv))
{
    jwtSettings.Secret = secretFromEnv;
}

var key = Encoding.UTF8.GetBytes(string.IsNullOrEmpty(jwtSettings.Secret) ? "tenvora-default-secret-key-change-in-production-12345678" : jwtSettings.Secret);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("TenantAdmin"));
    options.AddPolicy("OpsOrAdmin", policy => policy.RequireRole("TenantAdmin", "OperationsManager"));
});

var app = builder.Build();
var hasHttpsBinding = builder.Configuration["ASPNETCORE_URLS"]?.Contains("https://", StringComparison.OrdinalIgnoreCase) == true;
var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");

var enableSwagger = app.Environment.IsDevelopment()
                    || string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (enableSwagger || true) // Enable swagger by default in local dev
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Tenvora Operations API v1");
        options.RoutePrefix = "swagger";
    });
}

if (hasHttpsBinding)
{
    app.UseHttpsRedirection();
}

if (Directory.Exists(webRootPath))
{
    app.UseStaticFiles();
}

app.UseCors("ClientApp");
app.UseRateLimiter();

app.UseAuthentication();

// SECURITY: Set PostgreSQL session variable 'app.current_tenant_id' after authentication
// for PostgreSQL Row-Level Security (RLS) enforcement at the database layer.
app.UseTenantContext();

app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var userIdClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var isActive = await db.Users.AnyAsync(u => u.Id == userId && u.IsActive);
            if (!isActive)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { success = false, error = "Your account is inactive. Contact your organization administrator." });
                return;
            }
        }
    }

    await next();
});

// Correlation ID tracking middleware
app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault() ?? Guid.NewGuid().ToString("N");
    context.Response.Headers["X-Correlation-ID"] = correlationId;
    await next();
});

app.UseAuthorization();

// Liveness probe (process is up)
app.MapGet("/api/health/live", () => Results.Ok(new
{
    status = "healthy",
    service = "Tenvora API",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

// Readiness probe (checks database connectivity)
app.MapGet("/api/health/ready", async (AppDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        return canConnect 
            ? Results.Ok(new { status = "ready", database = "connected", timestamp = DateTimeOffset.UtcNow })
            : Results.Json(new { status = "unhealthy", database = "disconnected", timestamp = DateTimeOffset.UtcNow }, statusCode: 503);
    }
    catch (Exception ex)
    {
        return Results.Json(new { status = "unhealthy", error = ex.Message, timestamp = DateTimeOffset.UtcNow }, statusCode: 503);
    }
}).AllowAnonymous();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ready",
    service = "Tenvora API",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapControllers();

// Apply migrations and seed data on startup if relational database
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DatabaseSeeder.SeedAsync(dbContext);
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Database migration/seed skipped or failed on startup.");
}

await app.RunAsync();
