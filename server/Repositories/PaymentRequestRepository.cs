using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public class PaymentRequestRepository : IPaymentRequestRepository
{
    private readonly AppDbContext _context;

    public PaymentRequestRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentRequest?> GetByIdAsync(Guid tenantId, Guid id)
    {
        return await _context.PaymentRequests
            .Include(p => p.SourceAccount)
            .Include(p => p.DestinationAccount)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == id);
    }

    public async Task<PaymentRequest?> GetByIdempotencyKeyAsync(Guid tenantId, string idempotencyKey)
    {
        return await _context.PaymentRequests
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IdempotencyKey == idempotencyKey);
    }

    public async Task<List<PaymentRequest>> GetAllAsync(Guid tenantId, string? status = null)
    {
        var query = _context.PaymentRequests
            .Include(p => p.SourceAccount)
            .Include(p => p.DestinationAccount)
            .Where(p => p.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.Status == status);
        }

        return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
    }

    public async Task AddAsync(PaymentRequest request)
    {
        await _context.PaymentRequests.AddAsync(request);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(PaymentRequest request)
    {
        request.UpdatedAt = DateTime.UtcNow;
        _context.PaymentRequests.Update(request);
        await _context.SaveChangesAsync();
    }
}
