using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid tenantId, Guid transactionId);
    Task<Transaction?> GetByReferenceNumberAsync(Guid tenantId, string referenceNumber);
    Task<List<Transaction>> GetAllAsync(Guid tenantId, string? status = null, int limit = 100);
    Task AddAsync(Transaction transaction);
    Task UpdateAsync(Transaction transaction);
}
