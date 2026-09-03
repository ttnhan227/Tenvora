using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public sealed class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<AuditLog>> GetByTenantAsync(Guid tenantId, string? entityType = null, string? entityId = null, int limit = 100)
    {
        var query = _context.AuditLogs.Where(a => a.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(a => a.EntityType == entityType);
        }

        if (!string.IsNullOrWhiteSpace(entityId))
        {
            query = query.Where(a => a.EntityId == entityId);
        }

        return await query
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();
    }

    public async Task AddAsync(AuditLog log)
    {
        await _context.AuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }
}
