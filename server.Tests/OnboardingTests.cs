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

public sealed class OnboardingTests
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
    public async Task CompleteOnboarding_UpdatesTenantAndUserProfile()
    {
        await using var db = Db();
        var service = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Default Initial Business",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD",
            OnboardingCompleted = false,
            BusinessType = null
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "businessowner@example.com",
            PasswordHash = "hashed",
            Role = "TenantAdmin",
            PreferredCurrency = "USD"
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var request = new CompleteOnboardingRequest("Nhan Bakery & Café", "VND", "food");
        var result = await service.CompleteOnboardingAsync(user.Id, tenant.Id, request);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal("Nhan Bakery & Café", result.Data.CompanyName);
        Assert.Equal("VND", result.Data.PreferredCurrency);
        Assert.Equal("food", result.Data.BusinessType);
        Assert.True(result.Data.OnboardingCompleted);

        var reloadedTenant = await db.Tenants.FindAsync(tenant.Id);
        Assert.NotNull(reloadedTenant);
        Assert.Equal("Nhan Bakery & Café", reloadedTenant.CompanyName);
        Assert.Equal("VND", reloadedTenant.BaseCurrency);
        Assert.Equal("food", reloadedTenant.BusinessType);
        Assert.True(reloadedTenant.OnboardingCompleted);

        var reloadedUser = await db.Users.FindAsync(user.Id);
        Assert.NotNull(reloadedUser);
        Assert.Equal("VND", reloadedUser.PreferredCurrency);
    }

    [Fact]
    public async Task CompleteOnboarding_ValidatesRequiredFields()
    {
        await using var db = Db();
        var service = CreateAuthService(db);

        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Empty company name
        var badCompany = await service.CompleteOnboardingAsync(userId, tenantId, new CompleteOnboardingRequest("", "USD", "retail"));
        Assert.False(badCompany.Success);

        // Invalid currency
        var badCurrency = await service.CompleteOnboardingAsync(userId, tenantId, new CompleteOnboardingRequest("My Shop", "US", "retail"));
        Assert.False(badCurrency.Success);

        // Empty business type
        var badType = await service.CompleteOnboardingAsync(userId, tenantId, new CompleteOnboardingRequest("My Shop", "USD", ""));
        Assert.False(badType.Success);
    }

    [Fact]
    public async Task AuthController_CompleteOnboarding_ReturnsOk()
    {
        await using var db = Db();
        var service = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Raw Studio",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD",
            OnboardingCompleted = false
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "studio@example.com",
            PasswordHash = "hashed",
            Role = "TenantAdmin",
            PreferredCurrency = "USD"
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new AuthController(service);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("tenantId", tenant.Id.ToString()),
            new Claim(ClaimTypes.Role, "TenantAdmin")
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claims }
        };

        var response = await controller.CompleteOnboarding(new CompleteOnboardingRequest("Design Consulting Lab", "EUR", "services"));
        var okResult = Assert.IsType<OkObjectResult>(response);
        var apiResult = Assert.IsType<ApiResult<UserProfileResponse>>(okResult.Value);
        Assert.True(apiResult.Success);
        Assert.Equal("Design Consulting Lab", apiResult.Data!.CompanyName);
        Assert.Equal("EUR", apiResult.Data.PreferredCurrency);
        Assert.Equal("services", apiResult.Data.BusinessType);
        Assert.True(apiResult.Data.OnboardingCompleted);

        var updateResponse = await controller.UpdateSettings(new UpdateSettingsRequest("Tiệm Tạp Hoá Cô Ba", "VND", "retail", "Cô Ba", "0901234567"));
        var updateOkResult = Assert.IsType<OkObjectResult>(updateResponse);
        var updateApiResult = Assert.IsType<ApiResult<UserProfileResponse>>(updateOkResult.Value);
        Assert.True(updateApiResult.Success);
        Assert.Equal("Tiệm Tạp Hoá Cô Ba", updateApiResult.Data!.CompanyName);
        Assert.Equal("VND", updateApiResult.Data.PreferredCurrency);
        Assert.Equal("retail", updateApiResult.Data.BusinessType);
        Assert.Equal("Cô Ba", updateApiResult.Data.FullName);
        Assert.Equal("0901234567", updateApiResult.Data.PhoneNumber);
    }
}

