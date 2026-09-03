using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public class ReconciliationServiceTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"Tenvora_ReconTest_{Guid.NewGuid()}")
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task RunReconciliation_BalancedLedger_ReturnsCleanPassedStatus()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var account = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-RECON-001",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 1_000m,
            Status = AccountStatuses.Active
        };
        context.Accounts.Add(account);

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ReferenceNumber = "TX-RECON-001",
            Amount = 1_000m,
            Currency = "USD",
            Status = TransactionStatuses.Posted,
            CreatedAt = DateTime.UtcNow
        };
        context.Transactions.Add(tx);

        var entry = new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TransactionId = tx.Id,
            AccountId = account.Id,
            EntryType = "Debit",
            DebitAmount = 1_000m,
            CreditAmount = 0m,
            Currency = "USD",
            PostedAt = DateTime.UtcNow
        };
        context.LedgerEntries.Add(entry);
        await context.SaveChangesAsync();

        var reconRepo = new ReconciliationRepository(context);
        var ledgerRepo = new LedgerRepository(context);

        var reconService = new ReconciliationService(context, reconRepo, ledgerRepo);

        var run = await reconService.RunReconciliationAsync(tenantId, "Scheduled nightly audit");

        Assert.Equal("Passed", run.Status);
        Assert.Equal(0, run.DiscrepancyCount);
        Assert.Empty(run.Discrepancies);
    }

    [Fact]
    public async Task RunReconciliation_BalanceMismatch_DetectsDiscrepancy()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var account = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-RECON-MISMATCH",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 2_000m, // Mismatched cached balance vs ledger
            Status = AccountStatuses.Active
        };
        context.Accounts.Add(account);

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ReferenceNumber = "TX-RECON-002",
            Amount = 1_000m,
            Currency = "USD",
            Status = TransactionStatuses.Posted,
            CreatedAt = DateTime.UtcNow
        };
        context.Transactions.Add(tx);

        var entry = new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TransactionId = tx.Id,
            AccountId = account.Id,
            EntryType = "Debit",
            DebitAmount = 1_000m,
            CreditAmount = 0m,
            Currency = "USD",
            PostedAt = DateTime.UtcNow
        };
        context.LedgerEntries.Add(entry);
        await context.SaveChangesAsync();

        var reconRepo = new ReconciliationRepository(context);
        var ledgerRepo = new LedgerRepository(context);

        var reconService = new ReconciliationService(context, reconRepo, ledgerRepo);

        var run = await reconService.RunReconciliationAsync(tenantId, "Discrepancy audit");

        Assert.Equal("DiscrepanciesFound", run.Status);
        Assert.True(run.DiscrepancyCount > 0);
        Assert.NotEmpty(run.Discrepancies);

        var discrepancy = run.Discrepancies.First();
        Assert.Equal(account.Id, discrepancy.AccountId);
        Assert.Equal(2_000m, discrepancy.ExpectedBalance);
        Assert.Equal(1_000m, discrepancy.CalculatedBalance);
        Assert.Equal(1_000m, discrepancy.DiscrepancyAmount);
    }
}
