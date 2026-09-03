using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class IdempotencyRepository : IIdempotencyRepository
{
    private readonly AppDbContext _context;

    public IdempotencyRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IdempotencyRecord?> GetAsync(Guid tenantId, string key)
    {
        return await _context.IdempotencyRecords
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Key == key && r.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<bool> TryCreateAsync(IdempotencyRecord record)
    {
        try
        {
            await _context.IdempotencyRecords.AddAsync(record);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // Unique constraint violation on (TenantId, Key)
            return false;
        }
    }

    public async Task UpdateAsync(IdempotencyRecord record)
    {
        _context.IdempotencyRecords.Update(record);
        await _context.SaveChangesAsync();
    }
}
