using VeriSpend.Api.Data;
using VeriSpend.Api.Models;
using Xunit;

namespace VeriSpend.Api.Tests;

public sealed class StarterWorkspaceFactoryTests
{
    [Fact]
    public void Populate_CreatesDecisionReadyEnterpriseScenario()
    {
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Test", ApiKey = "test", PlanType = "Standard" };
        var owner = new User { Id = Guid.NewGuid(), Email = "owner@test.local", PasswordHash = "hash", Role = "Owner", Tenant = tenant };

        StarterWorkspaceFactory.Populate(tenant, owner, new DateTime(2026, 7, 14, 8, 0, 0, DateTimeKind.Utc));

        Assert.Equal("Professional", tenant.PlanType);
        Assert.True(tenant.AutoApprovalEnabled);
        Assert.NotNull(tenant.CategoryBudgets);
        Assert.Single(tenant.Subscriptions);
        Assert.Contains(tenant.Users, user => user.Role == "Manager");
        Assert.Contains(tenant.Users, user => user.Role == "Member");
        Assert.True(tenant.Expenses.Count >= 10);
        Assert.Contains(tenant.Expenses, expense => expense.Status == "Pending" && expense.Flagged);
        Assert.Contains(tenant.Expenses, expense => expense.Status == "Rejected");
        Assert.All(tenant.Expenses, expense => Assert.NotEmpty(expense.AuditLogs));
    }
}
