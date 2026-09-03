using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public class LedgerService : ILedgerService
{
    private readonly ILedgerRepository _ledgerRepository;
    private readonly IAccountRepository _accountRepository;

    public LedgerService(ILedgerRepository ledgerRepository, IAccountRepository accountRepository)
    {
        _ledgerRepository = ledgerRepository;
        _accountRepository = accountRepository;
    }

    public async Task<List<LedgerEntryResponse>> GetEntriesByTransactionIdAsync(Guid tenantId, Guid transactionId)
    {
        var entries = await _ledgerRepository.GetEntriesByTransactionIdAsync(tenantId, transactionId);
        return entries.Select(MapLedgerEntry).ToList();
    }

    public async Task<AccountLedgerHistoryResponse?> GetAccountLedgerHistoryAsync(Guid tenantId, Guid accountId)
    {
        var account = await _accountRepository.GetByIdAsync(tenantId, accountId);
        if (account == null) return null;

        var entries = await _ledgerRepository.GetEntriesByAccountIdAsync(tenantId, accountId);
        var derivedBalance = await _ledgerRepository.CalculateDerivedBalanceAsync(tenantId, accountId, account.AccountType);

        return new AccountLedgerHistoryResponse(
            account.Id,
            account.AccountNumber,
            account.AccountType,
            account.Currency,
            derivedBalance,
            account.CachedBalance,
            derivedBalance == account.CachedBalance,
            entries.Select(MapLedgerEntry).ToList()
        );
    }

    private static LedgerEntryResponse MapLedgerEntry(LedgerEntry l) => new(
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
    );
}
