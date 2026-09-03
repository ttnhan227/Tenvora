using Tenvora.Api.Models;

namespace Tenvora.Api.Services;

public interface IAuditLogService
{
    Task<List<AuditLog>> GetAuditLogsAsync(Guid tenantId, string? entityType = null, string? entityId = null, int limit = 100);
}
