using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using VeriSpend.Api.Data;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public sealed class TenantRepository : ITenantRepository
{
    private readonly AppDbContext _context;

    public TenantRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Tenant?> GetByIdAsync(Guid tenantId)
    {
        return _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
    }

    public Task<IEnumerable<Tenant>> GetAllAsync()
    {
        // SECURITY: RLS will filter results to the current tenant context.
        // For Slack cross-tenant lookups, use GetBySlackTeamIdAsync instead.
        return _context.Tenants.ToListAsync().ContinueWith(t => (IEnumerable<Tenant>)t.Result);
    }

    // SECURITY: Uses raw SQL with RLS bypass for Slack integration cross-tenant lookup.
    // This is acceptable because the lookup is by SlackTeamId (not sensitive data)
    // and Slack verification tokens are validated before this is called.
    public Task<Tenant?> GetBySlackTeamIdAsync(string slackTeamId)
    {
        return _context.Tenants
            .FromSqlRaw("SELECT * FROM public.\"Tenants\" WHERE \"SlackTeamId\" = {0}", slackTeamId)
            .FirstOrDefaultAsync();
    }

    public Task<bool> CompanyExistsAsync(string companyName)
    {
        return _context.Tenants.AnyAsync(t => t.CompanyName == companyName);
    }

    public Task AddAsync(Tenant tenant)
    {
        _context.Tenants.Add(tenant);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }

    public Task<IDbContextTransaction> BeginTransactionAsync()
    {
        return _context.Database.BeginTransactionAsync();
    }

    public Task ExecuteSqlRawAsync(string sql, params object[] parameters)
    {
        return _context.Database.ExecuteSqlRawAsync(sql, parameters);
    }
}