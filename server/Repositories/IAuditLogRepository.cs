using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public interface IAuditLogRepository
{
    Task<List<AuditLog>> GetByTenantAsync(Guid tenantId, string? entityType = null, string? entityId = null, int limit = 100);
    Task AddAsync(AuditLog log);
}
