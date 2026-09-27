using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Models;
using Tenvora.Api.Services;

namespace Tenvora.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Database.IsRelational()) await context.Database.MigrateAsync();
        if (!string.Equals(Environment.GetEnvironmentVariable("SEED_DEMO_DATA"), "true", StringComparison.OrdinalIgnoreCase)) return;
        if (await context.Tenants.AnyAsync()) return;

        var password = Required("SEED_ADMIN_PASSWORD");
        var tenant = new Tenant
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            CompanyName = Environment.GetEnvironmentVariable("SEED_TENANT_NAME")?.Trim() ?? "Example Business",
            ApiKey = Required("SEED_TENANT_API_KEY"), PlanType = "Business", BaseCurrency = "USD", Status = "Active"
        };
        tenant.Users.Add(new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), TenantId = tenant.Id,
            Email = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL")?.Trim().ToLowerInvariant() ?? "owner@tenvora.internal",
            PasswordHash = PasswordHasher.Hash(password), HasPassword = true, Role = "TenantAdmin", PreferredCurrency = tenant.BaseCurrency
        });
        context.Tenants.Add(tenant);
        await context.SaveChangesAsync();
    }

    private static string Required(string name)
    {
        var value = Environment.GetEnvironmentVariable(name)?.Trim();
        if (string.IsNullOrWhiteSpace(value) || value.StartsWith("your_", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"{name} must be configured when SEED_DEMO_DATA=true.");
        return value;
    }
}
