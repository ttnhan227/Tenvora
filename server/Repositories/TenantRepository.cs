using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Tenvora.Api.Data;
using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public sealed class TenantRepository : ITenantRepository
{
    private readonly AppDbContext _context;

    public TenantRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Tenant?> GetByIdAsync(Guid tenantId)
    {
        return await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
    }

    public async Task<Tenant?> GetByApiKeyAsync(string apiKey)
    {
        return await _context.Tenants.FirstOrDefaultAsync(t => t.ApiKey == apiKey);
    }

    public async Task<IEnumerable<Tenant>> GetAllAsync()
    {
        return await _context.Tenants.ToListAsync();
    }

    public async Task<bool> CompanyExistsAsync(string companyName)
    {
        return await _context.Tenants.AnyAsync(t => t.CompanyName == companyName);
    }

    public async Task AddAsync(Tenant tenant)
    {
        await _context.Tenants.AddAsync(tenant);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Tenant tenant)
    {
        tenant.UpdatedAt = DateTime.UtcNow;
        _context.Tenants.Update(tenant);
        await _context.SaveChangesAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }

    public async Task<IDbContextTransaction> BeginTransactionAsync()
    {
        return await _context.Database.BeginTransactionAsync();
    }
}
