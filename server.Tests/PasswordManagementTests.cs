using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using Tenvora.Api.Common;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class PasswordManagementTests
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

    private static AuthService CreateAuthService(AppDbContext db)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GoogleAuth:ClientId"] = "test-client-id"
        }).Build();

        return new AuthService(
            db,
            new UserRepository(db),
            new TenantRepository(db),
            new RefreshTokenRepository(db),
            CreateTokenService(),
            new TestGoogleAuthValidator(),
            config,
            NullLogger<AuthService>.Instance
        );
    }

    [Fact]
    public void HasPassword_DatabaseDefault_IsFalse_ForGoogleOnlyAccounts()
    {
        using var db = Db();
        var property = db.Model.FindEntityType(typeof(User))!
            .FindProperty(nameof(User.HasPassword))!;

        Assert.Equal(false, property.GetDefaultValue());
    }

    [Fact]
    public async Task GoogleUser_HasPasswordIsFalse_CannotLoginWithPasswordInitially()
    {
        using var db = Db();
        var authService = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Acme Corp",
            ApiKey = "key1",
            PlanType = "Business",
            BaseCurrency = "USD",
            Status = "Active"
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = "googleuser@example.com",
            GoogleSub = "sub-123",
            PasswordHash = PasswordHasher.Hash("random-placeholder"),
            HasPassword = false,
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var loginResult = await authService.LoginAsync(new LoginRequest(user.Email, "AnyPassword123!"));
        Assert.False(loginResult.Success);
        Assert.Contains("This account was created with Google", loginResult.Message);
    }

    [Fact]
    public async Task GoogleUser_CanSetPasswordWithoutCurrentPassword_AndThenLoginNormally()
    {
        using var db = Db();
        var authService = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Acme Corp",
            ApiKey = "key2",
            PlanType = "Business",
            BaseCurrency = "USD",
            Status = "Active"
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = "googleuser2@example.com",
            GoogleSub = "sub-456",
            PasswordHash = PasswordHasher.Hash("random-placeholder"),
            HasPassword = false,
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // 1. Setting password with invalid complexity fails
        var weakResult = await authService.SetPasswordAsync(user.Id, new SetPasswordRequest(null, "short"));
        Assert.False(weakResult.Success);

        // 2. Setting valid password without CurrentPassword succeeds for Google-only user
        var setResult = await authService.SetPasswordAsync(user.Id, new SetPasswordRequest(null, "NewStrongPassword123!"));
        Assert.True(setResult.Success);

        // 3. User in DB now has HasPassword == true
        var updatedUser = await db.Users.FindAsync(user.Id);
        Assert.NotNull(updatedUser);
        Assert.True(updatedUser.HasPassword);

        // 4. User can now log in using standard email and password!
        var loginResult = await authService.LoginAsync(new LoginRequest(user.Email, "NewStrongPassword123!"));
        Assert.True(loginResult.Success);
        Assert.NotNull(loginResult.Data);
        Assert.True(loginResult.Data.HasPassword);
        Assert.True(loginResult.Data.GoogleLinked);
    }

    [Fact]
    public async Task ExistingPasswordUser_MustProvideValidCurrentPassword()
    {
        using var db = Db();
        var authService = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Acme Corp",
            ApiKey = "key3",
            PlanType = "Business",
            BaseCurrency = "USD",
            Status = "Active"
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = "normaluser@example.com",
            PasswordHash = PasswordHasher.Hash("OldPassword123!"),
            HasPassword = true,
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Missing current password fails
        var missingResult = await authService.SetPasswordAsync(user.Id, new SetPasswordRequest(null, "BrandNewPassword123!"));
        Assert.False(missingResult.Success);
        Assert.Contains("Current password is required", missingResult.Message);

        // Wrong current password fails
        var wrongResult = await authService.SetPasswordAsync(user.Id, new SetPasswordRequest("WrongPass123!", "BrandNewPassword123!"));
        Assert.False(wrongResult.Success);
        Assert.Contains("Current password is incorrect", wrongResult.Message);

        // Correct current password succeeds
        var correctResult = await authService.SetPasswordAsync(user.Id, new SetPasswordRequest("OldPassword123!", "BrandNewPassword123!"));
        Assert.True(correctResult.Success);

        // Can log in with new password
        var loginNew = await authService.LoginAsync(new LoginRequest(user.Email, "BrandNewPassword123!"));
        Assert.True(loginNew.Success);

        // Cannot log in with old password
        var loginOld = await authService.LoginAsync(new LoginRequest(user.Email, "OldPassword123!"));
        Assert.False(loginOld.Success);
    }

    [Fact]
    public async Task Controller_SetPassword_EndToEnd()
    {
        using var db = Db();
        var authService = CreateAuthService(db);
        var controller = new AuthController(authService);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Controller Corp",
            ApiKey = "key4",
            PlanType = "Business",
            BaseCurrency = "USD",
            Status = "Active"
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = "controlleruser@example.com",
            PasswordHash = PasswordHasher.Hash("random-placeholder"),
            HasPassword = false,
            Role = "TenantAdmin",
            IsActive = true
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim("tenant_id", tenant.Id.ToString())
                }, "TestAuth"))
            }
        };

        var actionResult = await controller.SetPassword(new SetPasswordRequest(null, "ControllerNewPass123!"));
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var apiResult = Assert.IsAssignableFrom<ApiResult>(okResult.Value);
        Assert.True(apiResult.Success);
    }
}
