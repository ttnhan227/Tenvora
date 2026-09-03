using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly AppDbContext _context;

    public TransactionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Transaction?> GetByIdAsync(Guid tenantId, Guid transactionId)
    {
        return await _context.Transactions
            .Include(t => t.LedgerEntries)
                .ThenInclude(l => l.Account)
            .Include(t => t.PaymentRequest)
            .Include(t => t.OriginalTransaction)
            .Include(t => t.ReversalTransactions)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == transactionId);
    }

    public async Task<Transaction?> GetByReferenceNumberAsync(Guid tenantId, string referenceNumber)
    {
        return await _context.Transactions
            .Include(t => t.LedgerEntries)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.ReferenceNumber == referenceNumber);
    }

    public async Task<List<Transaction>> GetAllAsync(Guid tenantId, string? status = null, int limit = 100)
    {
        var query = _context.Transactions
            .Include(t => t.LedgerEntries)
            .Where(t => t.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(t => t.Status == status);
        }

        return await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task AddAsync(Transaction transaction)
    {
        await _context.Transactions.AddAsync(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Transaction transaction)
    {
        _context.Transactions.Update(transaction);
        await _context.SaveChangesAsync();
    }
}
