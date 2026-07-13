using System.IO;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Server.Common;
using Server.Data;
using Server.Middleware;
using Server.Repositories;
using Server.Services;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientApp", policy =>
    {
        var origins = new List<string>
        {
            "http://localhost:5173",
            "https://localhost:5173",
            "http://localhost:4173",
            "https://localhost:4173"
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
        Title = "AI Audit Expense Tracker API",
        Version = "v1",
        Description = "Interactive API documentation for authentication, expense management, manager workflows, tenant settings, and AI receipt processing."
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
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            jwtSecurityScheme,
            []
        }
    });

    options.DocumentFilter<SwaggerTagDescriptionsDocumentFilter>();
    options.OperationFilter<SwaggerExamplesOperationFilter>();
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.Configure<MistralSettings>(builder.Configuration.GetSection("MistralSettings"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddSingleton<TokenService>();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<IManagerService, ManagerService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IAiReceiptService, AiReceiptService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IRiskAssessmentService, RiskAssessmentService>();
builder.Services.AddScoped<IReviewAssistantService, ReviewAssistantService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IBudgetGuardrailService, BudgetGuardrailService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISlackService, SlackService>();
builder.Services.AddScoped<ICategoryRulesService, CategoryRulesService>();
builder.Services.AddScoped<IFxRateService, FxRateService>();
builder.Services.AddScoped<IAdvancedAnalyticsService, AdvancedAnalyticsService>();
builder.Services.AddScoped<IComplianceService, ComplianceService>();
builder.Services.AddSingleton<IBackgroundTaskQueue>(_ => new BackgroundTaskQueue(1000)); // capacity 1000

builder.Services.AddHttpClient("MistralClient");
builder.Services.AddHttpClient("SendGrid");
builder.Services.AddHttpClient("Slack");
builder.Services.AddHttpClient("Email");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("No database connection string found.");

if (connectionString.StartsWith("postgresql://") || connectionString.StartsWith("postgres://"))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<Server.Data.Interceptors.AuditLogSaveChangesInterceptor>();

builder.Services.AddDbContextFactory<AppDbContext>((sp, options) =>
    options.UseNpgsql(connectionString)
           .AddInterceptors(sp.GetRequiredService<Server.Data.Interceptors.AuditLogSaveChangesInterceptor>())
           .AddInterceptors(new Server.Data.Interceptors.EntityValidationInterceptor()));

var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>() ?? new JwtSettings();
var key = Encoding.UTF8.GetBytes(jwtSettings.Secret);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = true;
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
    options.AddPolicy("OwnerOrManager", policy => policy.RequireRole("Owner", "Manager"));
});

builder.Services.AddHostedService<AutoApprovalService>();
builder.Services.AddHostedService<WeeklyDigestBackgroundService>();
builder.Services.AddHostedService<DailySlackDigestBackgroundService>();
builder.Services.AddHostedService<QueuedHostedService>();

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
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AI Audit Expense Tracker API v1");
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

var uploadDir = Path.Combine(app.Environment.ContentRootPath, "Uploads");
Directory.CreateDirectory(uploadDir);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadDir),
    RequestPath = "/uploads"
});

app.UseAuthentication();

// SECURITY: Set PostgreSQL session variable 'app.current_tenant_id' after authentication
// so that Row-Level Security policies can filter data per-tenant at the database level.
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
                await context.Response.WriteAsJsonAsync(new { success = false, error = "Your account is inactive. Contact your Owner." });
                return;
            }
        }
    }

    await next();
});

app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ready",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DatabaseSeeder.SeedAsync(dbContext);
}

await app.RunAsync();
