using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class SettlementRepository : ISettlementRepository
{
    private readonly AppDbContext _context;

    public SettlementRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SettlementBatch?> GetByIdAsync(Guid tenantId, Guid batchId)
    {
        return await _context.SettlementBatches
            .Include(b => b.Entries)
                .ThenInclude(e => e.Transaction)
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == batchId);
    }

    public async Task<List<SettlementBatch>> GetAllAsync(Guid tenantId)
    {
        return await _context.SettlementBatches
            .Where(b => b.TenantId == tenantId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<Transaction>> GetUnsettledPostedTransactionsAsync(Guid tenantId, string currency)
    {
        // Find transactions that are in 'Posted' status and not yet in any settlement batch
        var settledTxIds = _context.SettlementEntries
            .Where(se => se.TenantId == tenantId)
            .Select(se => se.TransactionId);

        return await _context.Transactions
            .Where(t => t.TenantId == tenantId && 
                        t.Status == TransactionStatuses.Posted && 
                        t.Currency == currency &&
                        !settledTxIds.Contains(t.Id))
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task CreateBatchAsync(SettlementBatch batch, IEnumerable<Guid> transactionIds)
    {
        await _context.SettlementBatches.AddAsync(batch);
        
        foreach (var txId in transactionIds)
        {
            await _context.SettlementEntries.AddAsync(new SettlementEntry
            {
                Id = Guid.NewGuid(),
                TenantId = batch.TenantId,
                SettlementBatchId = batch.Id,
                TransactionId = txId,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Update transaction status to Settled
        var transactions = await _context.Transactions
            .Where(t => t.TenantId == batch.TenantId && transactionIds.Contains(t.Id))
            .ToListAsync();

        foreach (var tx in transactions)
        {
            tx.Status = TransactionStatuses.Settled;
            tx.SettledAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }
}
