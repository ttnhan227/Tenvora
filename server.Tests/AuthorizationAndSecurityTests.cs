using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public class AuthorizationAndSecurityTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"Tenvora_AuthTest_{Guid.NewGuid()}")
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task CrossTenantAccess_CannotAccessOrTransferForeignTenantAccounts()
    {
        using var context = CreateInMemoryDbContext();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var accountA = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            AccountNumber = "ACC-TENANT-A",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 5_000m,
            Status = AccountStatuses.Active
        };

        var accountB = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantB,
            AccountNumber = "ACC-TENANT-B",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 10_000m,
            Status = AccountStatuses.Active
        };

        context.Accounts.AddRange(accountA, accountB);
        await context.SaveChangesAsync();

        var accountRepo = new AccountRepository(context);
        var txRepo = new TransactionRepository(context);
        var ledgerRepo = new LedgerRepository(context);
        var pReqRepo = new PaymentRequestRepository(context);
        var idemRepo = new IdempotencyRepository(context);

        var transferService = new TransferService(context, accountRepo, txRepo, ledgerRepo, pReqRepo, idemRepo);

        // User from Tenant A tries to transfer from Account B (foreign tenant)
        var maliciousTransfer = new CreateTransferRequest(
            accountB.Id,
            accountA.Id,
            500m,
            "USD",
            "Cross-tenant theft attempt"
        );

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await transferService.ExecuteTransferAsync(tenantA, "idem-theft-001", maliciousTransfer);
        });

        // Verify account repositories strictly isolate queries by TenantId
        var tenantAAccounts = await accountRepo.GetAllAsync(tenantA);
        Assert.Single(tenantAAccounts);
        Assert.Equal(accountA.Id, tenantAAccounts[0].Id);

        var queriedForeignAccount = await accountRepo.GetByIdAsync(tenantA, accountB.Id);
        Assert.Null(queriedForeignAccount);
    }

    [Fact]
    public async Task CrossTenantLedgerHistory_ReturnsNullForForeignTenant()
    {
        using var context = CreateInMemoryDbContext();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var accountB = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantB,
            AccountNumber = "ACC-B",
            Currency = "USD",
            CachedBalance = 1_000m
        };
        context.Accounts.Add(accountB);
        await context.SaveChangesAsync();

        var ledgerRepo = new LedgerRepository(context);
        var accountRepo = new AccountRepository(context);
        var ledgerService = new LedgerService(ledgerRepo, accountRepo);

        var history = await ledgerService.GetAccountLedgerHistoryAsync(tenantA, accountB.Id);
        Assert.Null(history);
    }
}
