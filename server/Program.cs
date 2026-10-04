using System.IO;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Threading.RateLimiting;
using System.Security.Claims;
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

builder.Services.AddControllers(options => options.Filters.Add<WorkflowExceptionFilter>());
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
        new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(ApiResult.Fail(
            context.ModelState.Values.SelectMany(v => v.Errors).Select(e =>
                string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Check the submitted details." : e.ErrorMessage).ToList()));
});

// Rate limiting for sensitive financial and auth endpoints
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("auth-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("payments-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
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
            var validOrigins = extraOrigins
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(o => o.Trim().TrimEnd('/'))
                .Where(o => Uri.TryCreate(o, UriKind.Absolute, out _))
                .ToList();
            origins.AddRange(validOrigins);
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
        Title = "Tenvora Business Management API",
        Version = "v1",
        Description = "API documentation for Tenvora customers, products, sales, purchases, payments, expenses, and business activity."
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

// Services
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IGoogleAuthValidator, GoogleAuthValidator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IBusinessService, BusinessService>();
builder.Services.AddScoped<IAiAssistantService, AiAssistantService>();
builder.Services.AddScoped<IAiActionService, AiActionService>();
builder.Services.AddScoped<IAiAgentService, AiAgentService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();

var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("No database connection string found.");

connectionString = connectionString.Trim().Trim('"', '\'');

if (connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) || connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var portNum = uri.Port > 0 ? uri.Port : 5432;
    var isLocalOrDocker = uri.Host is "localhost" or "127.0.0.1" or "postgres";

    var hostPortEnv = Environment.GetEnvironmentVariable("POSTGRES_PORT");
    if (isLocalOrDocker && Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") != "true" && !File.Exists("/.dockerenv") && !string.IsNullOrWhiteSpace(hostPortEnv) && int.TryParse(hostPortEnv, out var hp))
    {
        portNum = hp;
    }
    var database = uri.AbsolutePath.TrimStart('/');

    var query = uri.Query.TrimStart('?');
    var sslMode = isLocalOrDocker ? "Disable" : "Require";
    string? searchPath = null;

    foreach (var part in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var kv = part.Split('=', 2);
        if (kv.Length == 2)
        {
            var paramKey = kv[0].Trim();
            var val = Uri.UnescapeDataString(kv[1].Trim());
            if (paramKey.Equals("sslmode", StringComparison.OrdinalIgnoreCase))
            {
                sslMode = val.Equals("disable", StringComparison.OrdinalIgnoreCase) ? "Disable" :
                          val.Equals("require", StringComparison.OrdinalIgnoreCase) ? "Require" :
                          val.Equals("prefer", StringComparison.OrdinalIgnoreCase) ? "Prefer" : val;
            }
            else if (paramKey.Equals("search_path", StringComparison.OrdinalIgnoreCase))
            {
                searchPath = val;
            }
            else if (paramKey.Equals("options", StringComparison.OrdinalIgnoreCase))
            {
                var match = System.Text.RegularExpressions.Regex.Match(val, @"search_path[=\s]+([^\s&]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    searchPath = match.Groups[1].Value.Trim('\'', '"');
                }
            }
        }
    }

    if (!string.IsNullOrWhiteSpace(searchPath))
    {
        if (!searchPath.Split(',').Any(s => s.Trim().Equals("public", StringComparison.OrdinalIgnoreCase)))
        {
            searchPath += ",public";
        }
    }

    var searchPathClause = !string.IsNullOrWhiteSpace(searchPath) ? $";Search Path={searchPath}" : "";
    connectionString = $"Host={uri.Host};Port={portNum};Database={database};Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true{searchPathClause}";
}
else if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") != "true" && !File.Exists("/.dockerenv"))
{
    if (connectionString.Contains("Host=postgres", StringComparison.OrdinalIgnoreCase) || connectionString.Contains("Host=localhost", StringComparison.OrdinalIgnoreCase))
    {
        connectionString = connectionString.Replace("Host=postgres", "Host=localhost");
        var hostPort = Environment.GetEnvironmentVariable("POSTGRES_PORT");
        if (!string.IsNullOrWhiteSpace(hostPort) && hostPort != "5432")
        {
            connectionString = System.Text.RegularExpressions.Regex.Replace(connectionString, @"Port=\d+", $"Port={hostPort}");
        }
    }
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

if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || Encoding.UTF8.GetByteCount(jwtSettings.Secret) < 32)
    throw new InvalidOperationException("Configure a JWT signing secret of at least 32 bytes.");
builder.Services.PostConfigure<JwtSettings>(settings => settings.Secret = jwtSettings.Secret);
var key = Encoding.UTF8.GetBytes(jwtSettings.Secret);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
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

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Tenvora Business API v1");
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
app.UseAuthentication();
app.UseRateLimiter();

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
            // Reuse the request-scoped context whose connection was pinned and
            // configured by TenantContextMiddleware; a new scope would bypass RLS.
            var db = context.RequestServices.GetRequiredService<AppDbContext>();
            var tenantClaim = context.User.FindFirst("tenantId")?.Value;
            var roleClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var isActive = Guid.TryParse(tenantClaim, out var tenantId) && await db.Users.AnyAsync(u => u.Id == userId && u.TenantId == tenantId && u.Role == roleClaim && u.IsActive);
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
    catch (Exception)
    {
        return Results.Json(new { status = "unhealthy", error = "Database readiness check failed.", timestamp = DateTimeOffset.UtcNow }, statusCode: 503);
    }
}).AllowAnonymous();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ready",
    service = "Tenvora API",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapGet("/api/mobile/apk", () =>
{
    var remoteApkUrl = Environment.GetEnvironmentVariable("MOBILE_APK_URL");
    if (!string.IsNullOrWhiteSpace(remoteApkUrl))
    {
        return Results.Redirect(remoteApkUrl);
    }

    var candidates = new[]
    {
        Path.Combine(Directory.GetCurrentDirectory(), "..", "client", "public", "downloads", "tenvora-mobile.apk"),
        Path.Combine(Directory.GetCurrentDirectory(), "..", "mobile", "build", "app", "outputs", "flutter-apk", "tenvora-galaxy-a25-google.apk"),
        Path.Combine(Directory.GetCurrentDirectory(), "..", "mobile", "build", "app", "outputs", "flutter-apk", "app-debug.apk"),
        Path.Combine(Directory.GetCurrentDirectory(), "..", "mobile", "build", "app", "outputs", "flutter-apk", "app-release.apk")
    };

    var newest = candidates
        .Where(File.Exists)
        .OrderByDescending(File.GetLastWriteTimeUtc)
        .FirstOrDefault();

    if (newest != null)
    {
        return Results.File(Path.GetFullPath(newest), "application/vnd.android.package-archive", "tenvora-mobile.apk");
    }

    // Fallback: Redirect to automated GitHub release build
    const string defaultReleaseUrl = "https://github.com/ttnhan227/Tenvora/releases/download/mobile-latest/tenvora-mobile.apk";
    return Results.Redirect(defaultReleaseUrl);
}).AllowAnonymous();

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
    logger.LogCritical(ex, "Database initialization failed; refusing to start.");
    throw;
}

await app.RunAsync();

