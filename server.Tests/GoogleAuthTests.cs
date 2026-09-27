using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Tenvora.Api.Common;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class GoogleAuthTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static TokenService CreateTokenService() =>
        new(Options.Create(new JwtSettings
        {
            Secret = "test-secret-that-is-at-least-32-characters-long-12345",
            Issuer = "Tenvora",
            Audience = "Tenvora",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7
        }));

    private static (AuthService service, TestGoogleAuthValidator validator, IConfiguration config) CreateAuthService(
        AppDbContext db,
        string? googleClientId = "google-client-id-123")
    {
        var configDict = new Dictionary<string, string?>();
        if (googleClientId != null)
        {
            configDict["GoogleAuth:ClientId"] = googleClientId;
        }
        var config = new ConfigurationBuilder().AddInMemoryCollection(configDict).Build();

        var validator = new TestGoogleAuthValidator();
        var userRepo = new UserRepository(db);
        var tenantRepo = new TenantRepository(db);
        var refreshRepo = new RefreshTokenRepository(db);
        var tokenService = CreateTokenService();
        var logger = NullLogger<AuthService>.Instance;

        var service = new AuthService(
            db,
            userRepo,
            tenantRepo,
            refreshRepo,
            tokenService,
            validator,
            config,
            logger
        );

        return (service, validator, config);
    }

    [Fact]
    public async Task GoogleLogin_WhenNotConfigured_Returns503()
    {
        await using var db = Db();
        var (service, _, _) = CreateAuthService(db, googleClientId: null);
        Environment.SetEnvironmentVariable("GOOGLE_CLIENT_ID", null);

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("some-credential"));

        var statusResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenCredentialEmpty_Returns422()
    {
        await using var db = Db();
        var (service, _, _) = CreateAuthService(db);

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("   "));

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, unprocessable.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenCredentialInvalid_Returns401()
    {
        await using var db = Db();
        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => throw new InvalidOperationException("Invalid signature");

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("bad-token"));

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenEmailNotVerified_Returns401()
    {
        await using var db = Db();
        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload("sub-1", "user@gmail.com", EmailVerified: false));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("unverified-token"));

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenUserExistsWithGoogleSub_ReturnsTokens()
    {
        await using var db = Db();
        var ct = TestContext.Current.CancellationToken;
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Acme Corp", ApiKey = "k", PlanType = "Business" };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "jane@example.com",
            GoogleSub = "google-sub-jane",
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload("google-sub-jane", "jane@example.com", EmailVerified: true));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("valid-jane-token"));

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var apiResult = Assert.IsType<ApiResult<AuthResponse>>(okResult.Value);
        Assert.True(apiResult.Success);
        Assert.NotNull(apiResult.Data?.AccessToken);
        Assert.Equal("jane@example.com", apiResult.Data?.Email);
        Assert.True(apiResult.Data?.GoogleLinked);
    }

    [Fact]
    public async Task GoogleLogin_WhenUserExistsWithAuthoritativeEmail_LinksGoogleSub()
    {
        await using var db = Db();
        var ct = TestContext.Current.CancellationToken;
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Acme Corp", ApiKey = "k", PlanType = "Business" };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "person@gmail.com",
            GoogleSub = null, // Not yet linked
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload("new-google-sub-123", "person@gmail.com", EmailVerified: true));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("token"));

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var apiResult = Assert.IsType<ApiResult<AuthResponse>>(okResult.Value);
        Assert.True(apiResult.Success);
        Assert.True(apiResult.Data?.GoogleLinked);

        var updatedUser = await db.Users.FirstAsync(u => u.Id == user.Id, ct);
        Assert.Equal("new-google-sub-123", updatedUser.GoogleSub);
    }

    [Fact]
    public async Task GoogleLogin_WhenUserExistsWithNonAuthoritativeEmail_RejectsWithConflict409()
    {
        await using var db = Db();
        var ct = TestContext.Current.CancellationToken;
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Acme Corp", ApiKey = "k", PlanType = "Business" };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "person@custom-domain.org",
            GoogleSub = null,
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload("new-sub", "person@custom-domain.org", EmailVerified: true, HostedDomain: null));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("token"));

        var conflict = Assert.IsType<ConflictObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenEmailLinkedToOtherGoogleSub_RejectsWithConflict409()
    {
        await using var db = Db();
        var ct = TestContext.Current.CancellationToken;
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Acme Corp", ApiKey = "k", PlanType = "Business" };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "person@gmail.com",
            GoogleSub = "existing-google-sub",
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload("different-google-sub", "person@gmail.com", EmailVerified: true));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("token"));

        var conflict = Assert.IsType<ConflictObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenUserInactive_RejectsWith403()
    {
        await using var db = Db();
        var ct = TestContext.Current.CancellationToken;
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Acme Corp", ApiKey = "k", PlanType = "Business" };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "inactive@gmail.com",
            GoogleSub = "inactive-sub",
            Role = "TenantAdmin",
            IsActive = false
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload("inactive-sub", "inactive@gmail.com", EmailVerified: true));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("token"));

        var statusResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task GoogleLogin_WhenNewUser_ProvisionsTenantAndUserAndReturnsTokens()
    {
        await using var db = Db();
        var ct = TestContext.Current.CancellationToken;
        var (service, validator, _) = CreateAuthService(db);
        validator.Handler = (_, _) => Task.FromResult(new GoogleAuthPayload(
            Subject: "google-new-user-999",
            Email: "alex@gmail.com",
            EmailVerified: true,
            Name: "Alex Mercer"
        ));

        var controller = new AuthController(service);
        var actionResult = await controller.GoogleLogin(new GoogleLoginRequest("token"));

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var apiResult = Assert.IsType<ApiResult<AuthResponse>>(okResult.Value);
        Assert.True(apiResult.Success);
        Assert.Equal("alex@gmail.com", apiResult.Data?.Email);
        Assert.Equal("Alex Mercer's Business", apiResult.Data?.CompanyName);
        Assert.Equal("TenantAdmin", apiResult.Data?.Role);
        Assert.True(apiResult.Data?.GoogleLinked);
        Assert.False(apiResult.Data?.HasPassword);

        var createdUser = await db.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.GoogleSub == "google-new-user-999", ct);
        Assert.NotNull(createdUser);
        Assert.Equal("alex@gmail.com", createdUser.Email);
        Assert.False(createdUser.HasPassword);
        Assert.NotNull(createdUser.Tenant);
        Assert.Equal("Alex Mercer's Business", createdUser.Tenant.CompanyName);
    }
}

public class TestGoogleAuthValidator : IGoogleAuthValidator
{
    public Func<string, string, Task<GoogleAuthPayload>> Handler { get; set; } =
        (cred, client) => Task.FromResult(new GoogleAuthPayload("sub-123", "user@gmail.com", true, "Test User", null));

    public Task<GoogleAuthPayload> ValidateAsync(string credential, string clientId) =>
        Handler(credential, clientId);
}
