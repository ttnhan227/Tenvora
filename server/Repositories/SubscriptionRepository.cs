using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Data;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public sealed class SubscriptionRepository : ISubscriptionRepository
{
    private readonly AppDbContext _context;

    public SubscriptionRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Subscription?> GetByTenantIdAsync(Guid tenantId)
    {
        return _context.Subscriptions
            .Where(s => s.TenantId == tenantId && !s.Cancelled)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();
    }

    public Task<Subscription?> GetByIdAsync(Guid subscriptionId)
    {
        return _context.Subscriptions.FirstOrDefaultAsync(s => s.Id == subscriptionId);
    }

    public Task AddAsync(Subscription subscription)
    {
        _context.Subscriptions.Add(subscription);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Subscription subscription)
    {
        _context.Subscriptions.Update(subscription);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
}
