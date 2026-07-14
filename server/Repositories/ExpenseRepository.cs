using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Common;
using VeriSpend.Api.Data;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public sealed class ExpenseRepository : IExpenseRepository
{
    private readonly AppDbContext _context;

    public ExpenseRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Expense>> GetExpensesAsync(Guid tenantId, string role, Guid userId)
    {
        IQueryable<Expense> query = _context.Expenses
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.Receipts)
            .Include(e => e.User)
            .AsNoTracking();

        if (!HasTenantWideExpenseAccess(role))
        {
            query = query.Where(e => e.UserId == userId);
        }

        return await query.OrderByDescending(e => e.CreatedAt).ToListAsync();
    }

    public Task<Expense?> GetByIdAsync(Guid id, Guid tenantId)
    {
        return _context.Expenses
            .Include(e => e.Receipts)
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenantId);
    }

    public Task<List<Expense>> GetPendingExpensesAsync(Guid tenantId)
    {
        return _context.Expenses
            .Where(e => e.TenantId == tenantId && (e.Status == ExpenseStatuses.Pending || e.Status == "Submitted"))
            .Include(e => e.Receipts)
            .Include(e => e.User)
            .AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public Task<List<Expense>> GetPendingExpensesForUpdateAsync(Guid tenantId)
    {
        return _context.Expenses
            .Where(e => e.TenantId == tenantId && (e.Status == ExpenseStatuses.Pending || e.Status == "Submitted"))
            .Include(e => e.Receipts)
            .Include(e => e.User)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public Task<List<Expense>> GetTenantExpensesAsync(Guid tenantId)
    {
        return _context.Expenses
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.Receipts)
            .Include(e => e.User)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task<int> CountReceiptsThisMonthAsync(Guid tenantId, DateTime monthStart)
    {
        return _context.Receipts
            .Where(r => r.Expense != null && r.Expense.TenantId == tenantId && r.UploadedAt >= monthStart)
            .CountAsync();
    }

    public Task AddAsync(Expense expense)
    {
        _context.Expenses.Add(expense);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }

    private static bool HasTenantWideExpenseAccess(string role)
    {
        return role.Equals("Owner", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Manager", StringComparison.OrdinalIgnoreCase);
    }
}
