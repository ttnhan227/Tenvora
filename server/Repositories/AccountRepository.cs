using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class AccountRepository : IAccountRepository
{
    private readonly AppDbContext _context;

    public AccountRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Account?> GetByIdAsync(Guid tenantId, Guid accountId)
    {
        return await _context.Accounts
            .Include(a => a.Customer)
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == accountId);
    }

    public async Task<Account?> GetByAccountNumberAsync(Guid tenantId, string accountNumber)
    {
        return await _context.Accounts
            .Include(a => a.Customer)
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AccountNumber == accountNumber);
    }

    public async Task<List<Account>> GetAllAsync(Guid tenantId, Guid? customerId = null)
    {
        var query = _context.Accounts
            .Include(a => a.Customer)
            .Where(a => a.TenantId == tenantId);

        if (customerId.HasValue)
        {
            query = query.Where(a => a.CustomerId == customerId.Value);
        }

        return await query.OrderBy(a => a.AccountNumber).ToListAsync();
    }

    public async Task<List<Account>> GetAccountsForUpdateAsync(Guid tenantId, params Guid[] accountIds)
    {
        // Enforce deterministic lock ordering by ID ascending to eliminate deadlocks
        var distinctSortedIds = accountIds.Distinct().OrderBy(id => id).ToList();

        if (distinctSortedIds.Count == 0)
            return new List<Account>();

        if (_context.Database.IsRelational())
        {
            // Use PostgreSQL row-level exclusive locks: SELECT ... FOR UPDATE
            // In EF Core / Npgsql, we execute raw SQL or lock-hint query
            var idsParam = string.Join(",", distinctSortedIds.Select(id => $"'{id}'"));
            var accounts = await _context.Accounts
                .FromSqlRaw($"SELECT * FROM \"Accounts\" WHERE \"TenantId\" = '{tenantId}' AND \"Id\" IN ({idsParam}) ORDER BY \"Id\" FOR UPDATE")
                .ToListAsync();

            return accounts;
        }

        // Fallback for in-memory test database
        return await _context.Accounts
            .Where(a => a.TenantId == tenantId && distinctSortedIds.Contains(a.Id))
            .OrderBy(a => a.Id)
            .ToListAsync();
    }

    public async Task AddAsync(Account account)
    {
        await _context.Accounts.AddAsync(account);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Account account)
    {
        account.UpdatedAt = DateTime.UtcNow;
        _context.Accounts.Update(account);
        await _context.SaveChangesAsync();
    }
}
