using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface ILedgerService
{
    Task<List<LedgerEntryResponse>> GetEntriesByTransactionIdAsync(Guid tenantId, Guid transactionId);
    Task<AccountLedgerHistoryResponse?> GetAccountLedgerHistoryAsync(Guid tenantId, Guid accountId);
}
