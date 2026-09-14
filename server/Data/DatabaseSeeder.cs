using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Database.IsRelational()) await context.Database.MigrateAsync();
        if (!string.Equals(Environment.GetEnvironmentVariable("SEED_DEMO_DATA"), "true", StringComparison.OrdinalIgnoreCase)) return;
        if (await context.Tenants.AnyAsync()) return;

        var apiKey = RequiredSecret("SEED_TENANT_API_KEY");
        var password = RequiredSecret("SEED_ADMIN_PASSWORD");
        var companyName = Environment.GetEnvironmentVariable("SEED_TENANT_NAME")?.Trim();
        var email = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL")?.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var tenant = new Tenant
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            CompanyName = string.IsNullOrWhiteSpace(companyName) ? "Northstar Creative Studio" : companyName,
            ApiKey = apiKey,
            PlanType = "FreelancerPro",
            BaseCurrency = "USD",
            Status = "Active",
            IsDemo = true,
            CreatedAt = now.AddDays(-60),
            UpdatedAt = now
        };
        var owner = new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            TenantId = tenant.Id,
            Email = string.IsNullOrWhiteSpace(email) ? "owner@tenvora.internal" : email,
            PasswordHash = Services.PasswordHasher.Hash(password),
            Role = "TenantAdmin",
            IsActive = true,
            PreferredCurrency = "USD",
            CreatedAt = now.AddDays(-60),
            UpdatedAt = now
        };

        StarterWorkspaceFactory.Populate(tenant, owner, now);
        context.Tenants.Add(tenant);
        await context.SaveChangesAsync();
    }

    private static string RequiredSecret(string name)
    {
        var value = Environment.GetEnvironmentVariable(name)?.Trim();
        if (string.IsNullOrWhiteSpace(value) || value.StartsWith("your_", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"{name} must be configured when SEED_DEMO_DATA=true.");
        return value;
    }
}
