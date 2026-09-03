using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Xunit;

namespace Tenvora.Tests;

public class StarterWorkspaceFactoryTests
{
    [Fact]
    public void Populate_SeedsEnterpriseTenantWithBalancedLedger()
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            CompanyName = "Test FinOps Corp",
            ApiKey = "test-key"
        };
        var owner = new User
        {
            Id = Guid.NewGuid(),
            Email = "admin@tenvora.internal",
            TenantId = tenant.Id
        };

        StarterWorkspaceFactory.Populate(tenant, owner, DateTime.UtcNow);

        Assert.Equal("Enterprise", tenant.PlanType);
        Assert.NotEmpty(tenant.Users);
        Assert.NotEmpty(tenant.Customers);
        Assert.NotEmpty(tenant.Accounts);
        Assert.NotEmpty(tenant.Transactions);

        var initialTx = tenant.Transactions.First();
        Assert.Equal(2, initialTx.LedgerEntries.Count);
        
        var totalDebits = initialTx.LedgerEntries.Sum(l => l.DebitAmount);
        var totalCredits = initialTx.LedgerEntries.Sum(l => l.CreditAmount);

        Assert.Equal(totalDebits, totalCredits);
        Assert.Equal(initialTx.Amount, totalDebits);
    }
}
