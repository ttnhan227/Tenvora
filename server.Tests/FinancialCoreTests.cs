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

public class FinancialCoreTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        return CreateNamedInMemoryDbContext($"Tenvora_Test_{Guid.NewGuid()}");
    }

    private AppDbContext CreateNamedInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task ExecuteTransfer_CreatesBalancedDoubleEntryLedger_InvariantEnforced()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var sourceAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-SRC-001",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 10_000m,
            Status = AccountStatuses.Active
        };

        var destAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-DST-001",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 2_000m,
            Status = AccountStatuses.Active
        };

        context.Accounts.AddRange(sourceAccount, destAccount);
        await context.SaveChangesAsync();

        var accountRepo = new AccountRepository(context);
        var txRepo = new TransactionRepository(context);
        var ledgerRepo = new LedgerRepository(context);
        var pReqRepo = new PaymentRequestRepository(context);
        var idemRepo = new IdempotencyRepository(context);

        var transferService = new TransferService(context, accountRepo, txRepo, ledgerRepo, pReqRepo, idemRepo);

        var request = new CreateTransferRequest(
            sourceAccount.Id,
            destAccount.Id,
            1_500m,
            "USD",
            "Vendor Payment"
        );

        var idempotencyKey = "idem-test-001";
        var response = await transferService.ExecuteTransferAsync(tenantId, idempotencyKey, request);

        Assert.Equal(TransactionStatuses.Posted, response.Status);
        Assert.Equal(1_500m, response.Amount);
        Assert.NotNull(response.TransactionId);

        var tx = await txRepo.GetByIdAsync(tenantId, response.TransactionId.Value);
        Assert.NotNull(tx);
        Assert.Equal(2, tx.LedgerEntries.Count);

        var totalDebits = tx.LedgerEntries.Sum(e => e.DebitAmount);
        var totalCredits = tx.LedgerEntries.Sum(e => e.CreditAmount);

        // Exact Balance Invariant: SUM(DebitAmount) = SUM(CreditAmount) = 1,500
        Assert.Equal(1_500m, totalDebits);
        Assert.Equal(1_500m, totalCredits);
        Assert.Equal(totalDebits, totalCredits);

        // Check updated account balances
        var updatedSource = await accountRepo.GetByIdAsync(tenantId, sourceAccount.Id);
        var updatedDest = await accountRepo.GetByIdAsync(tenantId, destAccount.Id);

        Assert.Equal(8_500m, updatedSource!.CachedBalance);
        Assert.Equal(3_500m, updatedDest!.CachedBalance);
    }

    [Fact]
    public async Task ExecuteTransfer_Idempotency_SameKeyProducesSingleTransaction()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var sourceAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-SRC-002",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 10_000m,
            Status = AccountStatuses.Active
        };

        var destAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-DST-002",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 0m,
            Status = AccountStatuses.Active
        };

        context.Accounts.AddRange(sourceAccount, destAccount);
        await context.SaveChangesAsync();

        var accountRepo = new AccountRepository(context);
        var txRepo = new TransactionRepository(context);
        var ledgerRepo = new LedgerRepository(context);
        var pReqRepo = new PaymentRequestRepository(context);
        var idemRepo = new IdempotencyRepository(context);

        var transferService = new TransferService(context, accountRepo, txRepo, ledgerRepo, pReqRepo, idemRepo);

        var request = new CreateTransferRequest(
            sourceAccount.Id,
            destAccount.Id,
            500m,
            "USD",
            "Repeated Request"
        );

        var idempotencyKey = "idem-test-repeat-001";
        var response1 = await transferService.ExecuteTransferAsync(tenantId, idempotencyKey, request);
        var response2 = await transferService.ExecuteTransferAsync(tenantId, idempotencyKey, request);

        Assert.Equal(response1.TransactionId, response2.TransactionId);
        Assert.Equal(response1.ReferenceNumber, response2.ReferenceNumber);

        // Exactly one transaction and two ledger entries exist in database
        var totalTransactions = await context.Transactions.CountAsync(t => t.TenantId == tenantId);
        var totalLedgerEntries = await context.LedgerEntries.CountAsync(l => l.TenantId == tenantId);

        Assert.Equal(1, totalTransactions);
        Assert.Equal(2, totalLedgerEntries);

        var updatedSource = await accountRepo.GetByIdAsync(tenantId, sourceAccount.Id);
        Assert.Equal(9_500m, updatedSource!.CachedBalance);
    }

    [Fact]
    public async Task ExecuteTransfer_InsufficientFunds_LeavesNoPartialState()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var sourceAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-SRC-003",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 100m,
            Status = AccountStatuses.Active
        };

        var destAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-DST-003",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 0m,
            Status = AccountStatuses.Active
        };

        context.Accounts.AddRange(sourceAccount, destAccount);
        await context.SaveChangesAsync();

        var accountRepo = new AccountRepository(context);
        var txRepo = new TransactionRepository(context);
        var ledgerRepo = new LedgerRepository(context);
        var pReqRepo = new PaymentRequestRepository(context);
        var idemRepo = new IdempotencyRepository(context);

        var transferService = new TransferService(context, accountRepo, txRepo, ledgerRepo, pReqRepo, idemRepo);

        var request = new CreateTransferRequest(
            sourceAccount.Id,
            destAccount.Id,
            5_000m,
            "USD",
            "Overdraft Attempt"
        );

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await transferService.ExecuteTransferAsync(tenantId, "idem-fail-001", request);
        });

        // Ensure zero financial movement or partial state occurred
        Assert.Equal(0, await context.Transactions.CountAsync());
        Assert.Equal(0, await context.LedgerEntries.CountAsync());
        Assert.Equal(0, await context.PaymentRequests.CountAsync());
    }

    [Fact]
    public async Task ConcurrentTransfers_CannotOverdraftAccount()
    {
        var dbName = $"Tenvora_ConcurrentTest_{Guid.NewGuid()}";
        var tenantId = Guid.NewGuid();
        var srcId = Guid.NewGuid();
        var dstId = Guid.NewGuid();

        using (var setupContext = CreateNamedInMemoryDbContext(dbName))
        {
            var sourceAccount = new Account
            {
                Id = srcId,
                TenantId = tenantId,
                AccountNumber = "ACC-CONCUR-SRC",
                AccountType = AccountTypes.Asset,
                Currency = "USD",
                CachedBalance = 1_000m,
                Status = AccountStatuses.Active
            };

            var destAccount = new Account
            {
                Id = dstId,
                TenantId = tenantId,
                AccountNumber = "ACC-CONCUR-DST",
                AccountType = AccountTypes.Asset,
                Currency = "USD",
                CachedBalance = 0m,
                Status = AccountStatuses.Active
            };

            setupContext.Accounts.AddRange(sourceAccount, destAccount);
            await setupContext.SaveChangesAsync();
        }

        // Attempt two simultaneous transfers of $800 each from an account with only $1000
        var task1 = Task.Run(async () =>
        {
            try
            {
                using var c1 = CreateNamedInMemoryDbContext(dbName);
                var ts = new TransferService(c1, new AccountRepository(c1), new TransactionRepository(c1), new LedgerRepository(c1), new PaymentRequestRepository(c1), new IdempotencyRepository(c1));
                await ts.ExecuteTransferAsync(tenantId, "idem-concurrent-1",
                    new CreateTransferRequest(srcId, dstId, 800m, "USD", "Transfer 1"));
                return true;
            }
            catch
            {
                return false;
            }
        });

        var task2 = Task.Run(async () =>
        {
            try
            {
                using var c2 = CreateNamedInMemoryDbContext(dbName);
                var ts = new TransferService(c2, new AccountRepository(c2), new TransactionRepository(c2), new LedgerRepository(c2), new PaymentRequestRepository(c2), new IdempotencyRepository(c2));
                await ts.ExecuteTransferAsync(tenantId, "idem-concurrent-2",
                    new CreateTransferRequest(srcId, dstId, 800m, "USD", "Transfer 2"));
                return true;
            }
            catch
            {
                return false;
            }
        });

        var results = await Task.WhenAll(task1, task2);
        var successes = results.Count(r => r);

        // Exactly one should succeed, one must fail due to balance check on locked row
        Assert.Equal(1, successes);

        using var verifyContext = CreateNamedInMemoryDbContext(dbName);
        var finalSource = await verifyContext.Accounts.FindAsync(srcId);
        var finalDest = await verifyContext.Accounts.FindAsync(dstId);

        Assert.Equal(200m, finalSource!.CachedBalance);
        Assert.Equal(800m, finalDest!.CachedBalance);
    }

    [Fact]
    public async Task ReverseTransaction_CreatesCompensatingBalancedEntries_MaintainsLedgerImmutability()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var sourceAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-SRC-004",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 10_000m,
            Status = AccountStatuses.Active
        };

        var destAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "ACC-DST-004",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 0m,
            Status = AccountStatuses.Active
        };

        context.Accounts.AddRange(sourceAccount, destAccount);
        await context.SaveChangesAsync();

        var accountRepo = new AccountRepository(context);
        var txRepo = new TransactionRepository(context);
        var ledgerRepo = new LedgerRepository(context);
        var pReqRepo = new PaymentRequestRepository(context);
        var idemRepo = new IdempotencyRepository(context);

        var transferService = new TransferService(context, accountRepo, txRepo, ledgerRepo, pReqRepo, idemRepo);

        var initial = await transferService.ExecuteTransferAsync(
            tenantId, 
            "idem-rev-001", 
            new CreateTransferRequest(sourceAccount.Id, destAccount.Id, 2_000m, "USD", "Transfer to reverse"));

        var reversalResponse = await transferService.ReverseTransactionAsync(tenantId, initial.TransactionId!.Value, "Duplicate charge");

        Assert.Equal(TransactionStatuses.Posted, reversalResponse.Status);
        
        var originalTx = await txRepo.GetByIdAsync(tenantId, initial.TransactionId.Value);
        Assert.Equal(TransactionStatuses.Reversed, originalTx!.Status);

        // Original ledger entries remain completely untouched and immutable
        var allEntries = await context.LedgerEntries.Where(l => l.TenantId == tenantId).ToListAsync();
        Assert.Equal(4, allEntries.Count); // 2 original + 2 compensating reversal entries

        // Verify original entries still have their original debit/credit lines
        var origEntries = allEntries.Where(e => e.TransactionId == initial.TransactionId.Value).ToList();
        Assert.Equal(2, origEntries.Count);
        Assert.Contains(origEntries, e => e.AccountId == destAccount.Id && e.DebitAmount == 2000m);
        Assert.Contains(origEntries, e => e.AccountId == sourceAccount.Id && e.CreditAmount == 2000m);

        // Verify reversal entries have inverted compensating lines
        var revEntries = allEntries.Where(e => e.TransactionId == reversalResponse.TransactionId!.Value).ToList();
        Assert.Equal(2, revEntries.Count);
        Assert.Contains(revEntries, e => e.AccountId == destAccount.Id && e.CreditAmount == 2000m);
        Assert.Contains(revEntries, e => e.AccountId == sourceAccount.Id && e.DebitAmount == 2000m);

        // Restored balances
        var finalSource = await accountRepo.GetByIdAsync(tenantId, sourceAccount.Id);
        var finalDest = await accountRepo.GetByIdAsync(tenantId, destAccount.Id);

        Assert.Equal(10_000m, finalSource!.CachedBalance);
        Assert.Equal(0m, finalDest!.CachedBalance);
    }
}
