using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Xunit;

namespace Tenvora.Tests;

public class StarterWorkspaceFactoryTests
{
    [Fact]
    public void Populate_SeedsFreelancerWorkspaceWithBalancedLedgerAndInvoices()
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Alex Rivera Design",
            ApiKey = "test-key"
        };
        var owner = new User
        {
            Id = Guid.NewGuid(),
            Email = "alex@riveradesign.co",
            TenantId = tenant.Id
        };

        StarterWorkspaceFactory.Populate(tenant, owner, DateTime.UtcNow);

        Assert.Equal("FreelancerPro", tenant.PlanType);
        Assert.Equal(25.0m, tenant.DefaultTaxSetAsideRate);
        Assert.True(tenant.AutoTaxSetAsideEnabled);
        Assert.NotEmpty(tenant.Users);
        Assert.NotEmpty(tenant.Accounts);
        Assert.NotEmpty(tenant.Clients);
        Assert.NotEmpty(tenant.Invoices);
        Assert.NotEmpty(tenant.Transactions);

        var taxTx = tenant.Transactions.First(t => t.ReferenceNumber.StartsWith("TAX-SPLIT"));
        Assert.Equal(2, taxTx.LedgerEntries.Count);
        
        var totalDebits = taxTx.LedgerEntries.Sum(l => l.DebitAmount);
        var totalCredits = taxTx.LedgerEntries.Sum(l => l.CreditAmount);

        Assert.Equal(totalDebits, totalCredits);
        Assert.Equal(taxTx.Amount, totalDebits);
    }
}
