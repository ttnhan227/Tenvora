using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public class TransferService : ITransferService
{
    private readonly AppDbContext _context;
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly ILedgerRepository _ledgerRepository;
    private readonly IPaymentRequestRepository _paymentRequestRepository;
    private readonly IIdempotencyRepository _idempotencyRepository;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _inMemoryLocks = new();

    public TransferService(
        AppDbContext context,
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        ILedgerRepository ledgerRepository,
        IPaymentRequestRepository paymentRequestRepository,
        IIdempotencyRepository idempotencyRepository)
    {
        _context = context;
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _ledgerRepository = ledgerRepository;
        _paymentRequestRepository = paymentRequestRepository;
        _idempotencyRepository = idempotencyRepository;
    }

    public async Task<CreatePaymentResponse> ExecuteTransferAsync(
        Guid tenantId, 
        string idempotencyKey, 
        CreateTransferRequest request, 
        string? actorEmail = null)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            throw new ArgumentException("Idempotency key is required for payment operations.", nameof(idempotencyKey));
        }

        if (request.SourceAccountId == request.DestinationAccountId)
        {
            throw new InvalidOperationException("Source and destination accounts must be distinct.");
        }

        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Transfer amount must be strictly positive.");
        }

        var normalizedCurrency = request.Currency.Trim().ToUpperInvariant();
        var payloadHash = ComputePayloadHash(request);

        // 1. Check Idempotency Record
        var existingRecord = await _idempotencyRepository.GetAsync(tenantId, idempotencyKey);
        if (existingRecord != null)
        {
            if (existingRecord.Status == "Completed" && !string.IsNullOrEmpty(existingRecord.ResponseBody))
            {
                return JsonSerializer.Deserialize<CreatePaymentResponse>(existingRecord.ResponseBody)!;
            }
            if (existingRecord.Status == "Processing")
            {
                throw new InvalidOperationException("A transaction with this idempotency key is already currently processing.");
            }
        }
        else
        {
            var newRecord = new IdempotencyRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Key = idempotencyKey,
                RequestHash = payloadHash,
                Status = "Processing",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };

            var created = await _idempotencyRepository.TryCreateAsync(newRecord);
            if (!created)
            {
                // Concurrency race on idempotency key insertion
                var raceRecord = await _idempotencyRepository.GetAsync(tenantId, idempotencyKey);
                if (raceRecord?.Status == "Completed" && !string.IsNullOrEmpty(raceRecord.ResponseBody))
                {
                    return JsonSerializer.Deserialize<CreatePaymentResponse>(raceRecord.ResponseBody)!;
                }
                throw new InvalidOperationException("A transaction with this idempotency key is already currently processing.");
            }
        }

        // 2. Begin Atomic Database Transaction
        var executionStrategy = _context.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            var isRelational = _context.Database.IsRelational();
            var dbTransaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;

            var sortedIds = new[] { request.SourceAccountId, request.DestinationAccountId }.OrderBy(x => x).ToList();
            List<SemaphoreSlim>? acquiredSemaphores = null;
            if (!isRelational)
            {
                acquiredSemaphores = new List<SemaphoreSlim>();
                foreach (var id in sortedIds)
                {
                    var sem = _inMemoryLocks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
                    await sem.WaitAsync();
                    acquiredSemaphores.Add(sem);
                }
            }

            try
            {
                // 3. Acquire Exclusive Row Locks in sorted order (ID ascending) to eliminate deadlocks
                var accounts = await _accountRepository.GetAccountsForUpdateAsync(
                    tenantId, 
                    request.SourceAccountId, 
                    request.DestinationAccountId);

                var sourceAccount = accounts.FirstOrDefault(a => a.Id == request.SourceAccountId);
                var destAccount = accounts.FirstOrDefault(a => a.Id == request.DestinationAccountId);

                if (sourceAccount == null)
                {
                    throw new InvalidOperationException($"Source account {request.SourceAccountId} not found in this organization.");
                }
                if (destAccount == null)
                {
                    throw new InvalidOperationException($"Destination account {request.DestinationAccountId} not found in this organization.");
                }

                // Currency checks
                if (sourceAccount.Currency != normalizedCurrency)
                {
                    throw new InvalidOperationException($"Source account currency ({sourceAccount.Currency}) does not match transfer currency ({normalizedCurrency}).");
                }
                if (destAccount.Currency != normalizedCurrency)
                {
                    throw new InvalidOperationException($"Destination account currency ({destAccount.Currency}) does not match transfer currency ({normalizedCurrency}).");
                }

                // Account status checks
                if (sourceAccount.Status != AccountStatuses.Active)
                {
                    throw new InvalidOperationException($"Source account is {sourceAccount.Status} and cannot originate transfers.");
                }
                if (destAccount.Status != AccountStatuses.Active)
                {
                    throw new InvalidOperationException($"Destination account is {destAccount.Status} and cannot receive transfers.");
                }

                // Balance check (for Asset accounts)
                if (sourceAccount.AccountType == AccountTypes.Asset && sourceAccount.CachedBalance < request.Amount)
                {
                    throw new InvalidOperationException($"Insufficient funds in source account. Available: {sourceAccount.CachedBalance}, Requested: {request.Amount}.");
                }

                // 4. Create PaymentRequest entity
                var pReqId = Guid.NewGuid();
                var paymentRequest = new PaymentRequest
                {
                    Id = pReqId,
                    TenantId = tenantId,
                    IdempotencyKey = idempotencyKey,
                    SourceAccountId = sourceAccount.Id,
                    DestinationAccountId = destAccount.Id,
                    Amount = request.Amount,
                    Currency = normalizedCurrency,
                    Purpose = request.Purpose,
                    Status = TransactionStatuses.Posted,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.PaymentRequests.AddAsync(paymentRequest);

                // 5. Create Financial Transaction entity
                var txId = Guid.NewGuid();
                var refNumber = $"TX-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
                var transaction = new Transaction
                {
                    Id = txId,
                    TenantId = tenantId,
                    PaymentRequestId = pReqId,
                    ReferenceNumber = refNumber,
                    TransactionType = TransactionTypes.Transfer,
                    Status = TransactionStatuses.Posted,
                    Amount = request.Amount,
                    Currency = normalizedCurrency,
                    Description = request.Purpose ?? "Account Transfer",
                    CreatedAt = DateTime.UtcNow,
                    PostedAt = DateTime.UtcNow
                };
                await _context.Transactions.AddAsync(transaction);

                // 6. Create Balanced Double-Entry Ledger Entries
                // Rule: SUM(DebitAmount) = SUM(CreditAmount) = request.Amount
                var debitEntry = new LedgerEntry
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    TransactionId = txId,
                    AccountId = destAccount.Id,
                    EntryType = "Debit",
                    DebitAmount = request.Amount,
                    CreditAmount = 0m,
                    Currency = normalizedCurrency,
                    PostedAt = DateTime.UtcNow,
                    Description = $"Transfer in from {sourceAccount.AccountNumber}"
                };

                var creditEntry = new LedgerEntry
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    TransactionId = txId,
                    AccountId = sourceAccount.Id,
                    EntryType = "Credit",
                    DebitAmount = 0m,
                    CreditAmount = request.Amount,
                    Currency = normalizedCurrency,
                    PostedAt = DateTime.UtcNow,
                    Description = $"Transfer out to {destAccount.AccountNumber}"
                };

                await _context.LedgerEntries.AddRangeAsync(debitEntry, creditEntry);

                // 7. Update Derived Cached Balances
                if (sourceAccount.AccountType == AccountTypes.Asset)
                    sourceAccount.CachedBalance -= request.Amount;
                else
                    sourceAccount.CachedBalance -= request.Amount;

                if (destAccount.AccountType == AccountTypes.Asset)
                    destAccount.CachedBalance += request.Amount;
                else
                    destAccount.CachedBalance += request.Amount;

                sourceAccount.UpdatedAt = DateTime.UtcNow;
                destAccount.UpdatedAt = DateTime.UtcNow;

                // 8. Commit SaveChanges and DB Transaction
                await _context.SaveChangesAsync();
                if (dbTransaction != null)
                {
                    await dbTransaction.CommitAsync();
                }

                // 9. Update Idempotency Record to Completed
                var response = new CreatePaymentResponse(
                    pReqId,
                    txId,
                    refNumber,
                    TransactionStatuses.Posted,
                    request.Amount,
                    normalizedCurrency,
                    null,
                    DateTime.UtcNow
                );

                var record = await _idempotencyRepository.GetAsync(tenantId, idempotencyKey);
                if (record != null)
                {
                    record.Status = "Completed";
                    record.StatusCode = 200;
                    record.ResponseBody = JsonSerializer.Serialize(response);
                    await _idempotencyRepository.UpdateAsync(record);
                }

                return response;
            }
            catch (Exception)
            {
                if (dbTransaction != null)
                {
                    await dbTransaction.RollbackAsync();
                }
                throw;
            }
            finally
            {
                if (acquiredSemaphores != null)
                {
                    foreach (var sem in acquiredSemaphores)
                    {
                        sem.Release();
                    }
                }
            }
        });
    }

    public async Task<CreatePaymentResponse> ReverseTransactionAsync(
        Guid tenantId, 
        Guid transactionId, 
        string? reason = null, 
        string? actorEmail = null)
    {
        var originalTx = await _context.Transactions
            .Include(t => t.LedgerEntries)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == transactionId);

        if (originalTx == null)
        {
            throw new InvalidOperationException($"Transaction {transactionId} not found.");
        }

        if (originalTx.Status != TransactionStatuses.Posted && originalTx.Status != TransactionStatuses.Settled)
        {
            throw new InvalidOperationException($"Transaction is in status {originalTx.Status} and cannot be reversed.");
        }

        var executionStrategy = _context.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            var isRelational = _context.Database.IsRelational();
            var dbTransaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
            try
            {
                var accountIds = originalTx.LedgerEntries.Select(l => l.AccountId).Distinct().ToArray();
                var accounts = await _accountRepository.GetAccountsForUpdateAsync(tenantId, accountIds);

                // Create Reversal Transaction
                var reversalTxId = Guid.NewGuid();
                var refNumber = $"REV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
                var reversalTx = new Transaction
                {
                    Id = reversalTxId,
                    TenantId = tenantId,
                    PaymentRequestId = originalTx.PaymentRequestId,
                    ReferenceNumber = refNumber,
                    TransactionType = TransactionTypes.Reversal,
                    Status = TransactionStatuses.Posted,
                    OriginalTransactionId = originalTx.Id,
                    Amount = originalTx.Amount,
                    Currency = originalTx.Currency,
                    Description = reason ?? $"Reversal of {originalTx.ReferenceNumber}",
                    CreatedAt = DateTime.UtcNow,
                    PostedAt = DateTime.UtcNow
                };
                await _context.Transactions.AddAsync(reversalTx);

                // Create Inverted Compensating Ledger Entries
                var reversalEntries = new List<LedgerEntry>();
                foreach (var origEntry in originalTx.LedgerEntries)
                {
                    var account = accounts.First(a => a.Id == origEntry.AccountId);
                    var isDebit = origEntry.DebitAmount > 0;
                    
                    var revEntry = new LedgerEntry
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        TransactionId = reversalTxId,
                        AccountId = origEntry.AccountId,
                        EntryType = isDebit ? "Credit" : "Debit",
                        DebitAmount = isDebit ? 0m : origEntry.CreditAmount,
                        CreditAmount = isDebit ? origEntry.DebitAmount : 0m,
                        Currency = origEntry.Currency,
                        PostedAt = DateTime.UtcNow,
                        Description = $"Reversal compensating entry for {origEntry.Id}"
                    };
                    reversalEntries.Add(revEntry);

                    // Adjust cached balance accordingly
                    if (isDebit)
                    {
                        account.CachedBalance -= origEntry.DebitAmount;
                    }
                    else
                    {
                        account.CachedBalance += origEntry.CreditAmount;
                    }
                    account.UpdatedAt = DateTime.UtcNow;
                }

                await _context.LedgerEntries.AddRangeAsync(reversalEntries);
                originalTx.Status = TransactionStatuses.Reversed;

                await _context.SaveChangesAsync();
                if (dbTransaction != null)
                {
                    await dbTransaction.CommitAsync();
                }

                return new CreatePaymentResponse(
                    originalTx.PaymentRequestId ?? Guid.Empty,
                    reversalTxId,
                    refNumber,
                    TransactionStatuses.Posted,
                    originalTx.Amount,
                    originalTx.Currency,
                    null,
                    DateTime.UtcNow
                );
            }
            catch (Exception)
            {
                if (dbTransaction != null)
                {
                    await dbTransaction.RollbackAsync();
                }
                throw;
            }
        });
    }

    public async Task<TransactionResponse?> GetTransactionByIdAsync(Guid tenantId, Guid transactionId)
    {
        var tx = await _transactionRepository.GetByIdAsync(tenantId, transactionId);
        if (tx == null) return null;

        return MapTransaction(tx);
    }

    public async Task<List<TransactionResponse>> GetTransactionsAsync(Guid tenantId, string? status = null, int limit = 100)
    {
        var transactions = await _transactionRepository.GetAllAsync(tenantId, status, limit);
        return transactions.Select(MapTransaction).ToList();
    }

    private static TransactionResponse MapTransaction(Transaction t) => new(
        t.Id,
        t.TenantId,
        t.PaymentRequestId,
        t.ReferenceNumber,
        t.TransactionType,
        t.Status,
        t.OriginalTransactionId,
        t.Amount,
        t.Currency,
        t.Description,
        t.CreatedAt,
        t.PostedAt,
        t.SettledAt,
        t.LedgerEntries.Select(l => new LedgerEntryResponse(
            l.Id,
            l.TransactionId,
            l.AccountId,
            l.Account?.AccountNumber,
            l.EntryType,
            l.DebitAmount,
            l.CreditAmount,
            l.Currency,
            l.PostedAt,
            l.Description
        )).ToList()
    );

    private static string ComputePayloadHash(CreateTransferRequest request)
    {
        var raw = $"{request.SourceAccountId}:{request.DestinationAccountId}:{request.Amount:F4}:{request.Currency}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }
}
