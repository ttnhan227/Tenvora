using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface IReconciliationRepository
{
    Task<ReconciliationRun?> GetByIdAsync(Guid tenantId, Guid id);
    Task<List<ReconciliationRun>> GetAllAsync(Guid tenantId);
    Task AddRunAsync(ReconciliationRun run);
}
