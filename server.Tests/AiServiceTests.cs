using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public class AiServiceTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"Tenvora_AiTest_{Guid.NewGuid()}")
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public void GetStatus_ReturnsOperationalLocalStatus_WhenNoApiKeyConfigured()
    {
        using var context = CreateInMemoryDbContext();
        var config = new ConfigurationBuilder().Build();
        var aiService = new AiService(context, config);

        var status = aiService.GetStatus();

        Assert.Equal("Operational", status.Status);
        Assert.Equal("Local Financial Engine", status.Provider);
        Assert.False(status.ExternalLlmConfigured);
        Assert.Contains("TaxAdvisory", status.Capabilities);
    }

    [Fact]
    public async Task ProcessQuery_ReturnsDeterministicGreeting_ForHello()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Studio Alpha",
            ApiKey = "key-alpha",
            PlanType = "FreelancerPro"
        });
        await context.SaveChangesAsync();

        var aiService = new AiService(context, new ConfigurationBuilder().Build());
        var result = await aiService.ProcessQueryAsync(tenantId, "Hello, what can you do?");

        Assert.Equal("local-financial-engine", result.Source);
        Assert.Contains("Tenvora cash-flow assistant", result.Response);
        Assert.Contains("not connected to your bank", result.Response);
    }

    [Fact]
    public async Task ProcessQuery_CalculatesTaxReserveEstimate_Accurately()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Pixel Works",
            ApiKey = "key-pixel",
            PlanType = "FreelancerPro",
            BaseCurrency = "USD",
            DefaultTaxSetAsideRate = 20m
        };
        var taxVault = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "TAX-VAULT-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 1_000m,
            Status = AccountStatuses.Active
        };
        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Acme Corp",
            ContactEmail = "billing@acme.test",
            Company = "Acme Corp",
            Currency = "USD"
        };
        var paidInvoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = client.Id,
            InvoiceNumber = "INV-2026-099",
            Currency = "USD",
            TotalAmount = 10_000m,
            AmountPaid = 10_000m,
            Status = InvoiceStatuses.Paid,
            PaidAt = DateTime.UtcNow
        };

        context.Tenants.Add(tenant);
        context.Accounts.Add(taxVault);
        context.Clients.Add(client);
        context.Invoices.Add(paidInvoice);
        await context.SaveChangesAsync();

        var aiService = new AiService(context, new ConfigurationBuilder().Build());
        var result = await aiService.ProcessQueryAsync(tenantId, "How much tax do I owe this quarter?");

        // 10,000 * 20% = 2,000 estimated tax target. Vault has 1,000. Gap = 1,000.
        Assert.Equal("local-financial-engine", result.Source);
        Assert.Contains("20%", result.Response);
        Assert.Contains("2,000.00 USD", result.Response);
        Assert.Contains("1,000.00 USD gap", result.Response);
    }

    [Fact]
    public async Task ProcessQuery_ChecksAffordability_AgainstRecordedOperatingBalance()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Design Co",
            ApiKey = "key-design",
            PlanType = "FreelancerPro",
            BaseCurrency = "USD"
        };
        var mainAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "MAIN-WALLET-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 3_500m,
            Status = AccountStatuses.Active
        };

        context.Tenants.Add(tenant);
        context.Accounts.Add(mainAccount);
        await context.SaveChangesAsync();

        var aiService = new AiService(context, new ConfigurationBuilder().Build());

        // Test affordable purchase ($1,200 < $3,500)
        var resultAffordable = await aiService.ProcessQueryAsync(tenantId, "Can I afford to buy a new laptop for $1,200?");
        Assert.Contains("covers 1,200.00 USD", resultAffordable.Response);
        Assert.Contains("leaving 2,300.00 USD", resultAffordable.Response);

        // Test unaffordable purchase ($5,000 > $3,500)
        var resultExpensive = await aiService.ProcessQueryAsync(tenantId, "Can I spend $5,000 on studio gear?");
        Assert.Contains("above your recorded safe-to-spend estimate", resultExpensive.Response);
    }
}
