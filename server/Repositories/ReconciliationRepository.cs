using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class ReconciliationRepository : IReconciliationRepository
{
    private readonly AppDbContext _context;

    public ReconciliationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReconciliationRun?> GetByIdAsync(Guid tenantId, Guid id)
    {
        return await _context.ReconciliationRuns
            .Include(r => r.Discrepancies)
                .ThenInclude(d => d.Account)
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == id);
    }

    public async Task<List<ReconciliationRun>> GetAllAsync(Guid tenantId)
    {
        return await _context.ReconciliationRuns
            .Include(r => r.Discrepancies)
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.StartedAt)
            .ToListAsync();
    }

    public async Task AddRunAsync(ReconciliationRun run)
    {
        await _context.ReconciliationRuns.AddAsync(run);
        await _context.SaveChangesAsync();
    }
}
