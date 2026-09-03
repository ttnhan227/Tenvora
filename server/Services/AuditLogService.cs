using Tenvora.Api.Models;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task<List<AuditLog>> GetAuditLogsAsync(Guid tenantId, string? entityType = null, string? entityId = null, int limit = 100)
    {
        return await _auditLogRepository.GetByTenantAsync(tenantId, entityType, entityId, limit);
    }
}
