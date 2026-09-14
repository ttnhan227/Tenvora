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
        Assert.NotEmpty(tenant.Projects);
        Assert.NotEmpty(tenant.Expenses);
        Assert.NotEmpty(tenant.InvoicePayments);
        Assert.NotEmpty(tenant.Transactions);

        foreach (var transaction in tenant.Transactions)
        {
            Assert.Equal(2, transaction.LedgerEntries.Count);
            Assert.Equal(transaction.LedgerEntries.Sum(l => l.DebitAmount), transaction.LedgerEntries.Sum(l => l.CreditAmount));
            Assert.Equal(transaction.Amount, transaction.LedgerEntries.Sum(l => l.DebitAmount));
        }

        foreach (var account in tenant.Accounts)
        {
            var lines = tenant.Transactions.SelectMany(t => t.LedgerEntries).Where(l => l.AccountId == account.Id);
            var derived = account.AccountType is "Liability" or "Equity"
                ? lines.Sum(l => l.CreditAmount - l.DebitAmount)
                : lines.Sum(l => l.DebitAmount - l.CreditAmount);
            Assert.Equal(account.CachedBalance, derived);
        }
    }
}
