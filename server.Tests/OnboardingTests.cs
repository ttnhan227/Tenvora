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
    public async Task CompleteOnboarding_CanOnlyRunOnce_AndDoesNotOverwriteWorkspace()
    {
        await using var db = Db();
        var service = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "First Business",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD",
            BusinessType = "retail",
            OnboardingCompleted = true
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "owner@example.com",
            PasswordHash = "hashed",
            Role = "TenantAdmin",
            PreferredCurrency = "USD"
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var result = await service.CompleteOnboardingAsync(
            user.Id,
            tenant.Id,
            new CompleteOnboardingRequest("Replacement Business", "VND", "food"));

        Assert.False(result.Success);
        Assert.Contains("Use Settings", result.Message);
        Assert.Equal("First Business", tenant.CompanyName);
        Assert.Equal("USD", tenant.BaseCurrency);
        Assert.Equal("retail", tenant.BusinessType);
        Assert.Equal("USD", user.PreferredCurrency);
    }

    [Fact]
    public async Task WorkspaceSetupAndSettings_RejectNonAdministrators()
    {
        await using var db = Db();
        var service = CreateAuthService(db);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Owner Controlled Business",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD",
            BusinessType = "retail",
            OnboardingCompleted = false
        };
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = "operator@example.com",
            PasswordHash = "hashed",
            Role = "OperationsManager",
            PreferredCurrency = "USD"
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var onboarding = await service.CompleteOnboardingAsync(
            user.Id, tenant.Id, new CompleteOnboardingRequest("Changed", "VND", "food"));
        var settings = await service.UpdateSettingsAsync(
            user.Id, tenant.Id, new UpdateSettingsRequest("Changed", "VND", "food"));

        Assert.False(onboarding.Success);
        Assert.False(settings.Success);
        Assert.Contains("administrators", onboarding.Message);
        Assert.Contains("administrators", settings.Message);
        Assert.Equal("Owner Controlled Business", tenant.CompanyName);
        Assert.Equal("USD", tenant.BaseCurrency);
        Assert.False(tenant.OnboardingCompleted);
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

        var repeatedResponse = await controller.CompleteOnboarding(new CompleteOnboardingRequest("Overwrite Attempt", "USD", "simple"));
        Assert.IsType<ConflictObjectResult>(repeatedResponse);

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

    [Theory]
    [InlineData(50000, 2.0000)]
    [InlineData(35000, 1.4000)]
    [InlineData(45000, 1.8000)]
    [InlineData(120000, 4.8000)]
    [InlineData(250000, 10.0000)]
    [InlineData(2700000, 108.0000)]
    public void CurrencyConverter_ConvertsReversibly_BetweenVndAndUsd(decimal vndPrice, decimal expectedUsd)
    {
        // VND -> USD
        var usd = CurrencyConverter.Convert(vndPrice, "VND", "USD");
        Assert.Equal(expectedUsd, usd);

        // USD -> VND (Switch back gives the EXACT same number)
        var backToVnd = CurrencyConverter.Convert(usd, "USD", "VND");
        Assert.Equal(vndPrice, backToVnd);
    }

    [Fact]
    public async Task UpdateSettings_ConvertsExistingProducts_WhenCurrencyChangesBackAndForth()
    {
        await using var db = Db();
        var service = CreateAuthService(db);

        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Figure Cafe",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            BusinessType = "food",
            OnboardingCompleted = true
        };
        var user = new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "owner@figurecafe.test",
            PasswordHash = "hashed",
            Role = "TenantAdmin",
            PreferredCurrency = "VND"
        };
        var product = new Tenvora.Api.Domain.Entities.Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Goku Figure",
            Unit = "item",
            DefaultPrice = 50_000m,
            CostPrice = 30_000m,
            Currency = "VND"
        };
        db.Tenants.Add(tenant);
        db.Users.Add(user);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        // 1. Switch from VND to USD
        var resultUsd = await service.UpdateSettingsAsync(userId, tenantId,
            new UpdateSettingsRequest("Figure Cafe", "USD", "food"));
        Assert.True(resultUsd.Success);
        Assert.Equal("USD", resultUsd.Data!.PreferredCurrency);

        var reloadedProductUsd = await db.Products.FindAsync(product.Id);
        Assert.NotNull(reloadedProductUsd);
        Assert.Equal("USD", reloadedProductUsd.Currency);
        Assert.Equal(2.0000m, reloadedProductUsd.DefaultPrice);
        Assert.Equal(1.2000m, reloadedProductUsd.CostPrice);

        // 2. Switch from USD back to VND -> Returns the EXACT same number!
        var resultVnd = await service.UpdateSettingsAsync(userId, tenantId,
            new UpdateSettingsRequest("Figure Cafe", "VND", "food"));
        Assert.True(resultVnd.Success);
        Assert.Equal("VND", resultVnd.Data!.PreferredCurrency);

        var reloadedProductVnd = await db.Products.FindAsync(product.Id);
        Assert.NotNull(reloadedProductVnd);
        Assert.Equal("VND", reloadedProductVnd.Currency);
        Assert.Equal(50_000m, reloadedProductVnd.DefaultPrice);
        Assert.Equal(30_000m, reloadedProductVnd.CostPrice);
    }
}
