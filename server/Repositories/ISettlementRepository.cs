using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface ISettlementRepository
{
    Task<SettlementBatch?> GetByIdAsync(Guid tenantId, Guid batchId);
    Task<List<SettlementBatch>> GetAllAsync(Guid tenantId);
    Task<List<Transaction>> GetUnsettledPostedTransactionsAsync(Guid tenantId, string currency);
    Task CreateBatchAsync(SettlementBatch batch, IEnumerable<Guid> transactionIds);
}
