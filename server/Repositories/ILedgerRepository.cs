using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface ILedgerRepository
{
    Task<List<LedgerEntry>> GetEntriesByTransactionIdAsync(Guid tenantId, Guid transactionId);
    Task<List<LedgerEntry>> GetEntriesByAccountIdAsync(Guid tenantId, Guid accountId, int limit = 100);
    Task<decimal> CalculateDerivedBalanceAsync(Guid tenantId, Guid accountId, string accountType);
    Task AddEntriesAsync(IEnumerable<LedgerEntry> entries);
}
