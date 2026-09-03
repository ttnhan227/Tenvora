using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class LedgerRepository : ILedgerRepository
{
    private readonly AppDbContext _context;

    public LedgerRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<LedgerEntry>> GetEntriesByTransactionIdAsync(Guid tenantId, Guid transactionId)
    {
        return await _context.LedgerEntries
            .Include(l => l.Account)
            .Where(l => l.TenantId == tenantId && l.TransactionId == transactionId)
            .OrderBy(l => l.PostedAt)
            .ToListAsync();
    }

    public async Task<List<LedgerEntry>> GetEntriesByAccountIdAsync(Guid tenantId, Guid accountId, int limit = 100)
    {
        return await _context.LedgerEntries
            .Include(l => l.Transaction)
            .Where(l => l.TenantId == tenantId && l.AccountId == accountId)
            .OrderByDescending(l => l.PostedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<decimal> CalculateDerivedBalanceAsync(Guid tenantId, Guid accountId, string accountType)
    {
        var entries = await _context.LedgerEntries
            .Where(l => l.TenantId == tenantId && l.AccountId == accountId)
            .ToListAsync();

        var totalDebits = entries.Sum(e => e.DebitAmount);
        var totalCredits = entries.Sum(e => e.CreditAmount);

        // For Asset/Expense accounts: Balance = Debits - Credits
        // For Liability/Settlement/Equity accounts: Balance = Credits - Debits
        if (accountType == AccountTypes.Asset)
        {
            return totalDebits - totalCredits;
        }

        return totalCredits - totalDebits;
    }

    public async Task AddEntriesAsync(IEnumerable<LedgerEntry> entries)
    {
        await _context.LedgerEntries.AddRangeAsync(entries);
        await _context.SaveChangesAsync();
    }
}
