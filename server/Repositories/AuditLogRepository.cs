using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Data;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public sealed class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task AddAsync(AuditLog auditLog)
    {
        _context.AuditLogs.Add(auditLog);
        return Task.CompletedTask;
    }

    public Task<List<AuditLog>> GetByExpenseIdAsync(Guid expenseId)
    {
        return _context.AuditLogs
            .Where(a => a.ExpenseId == expenseId)
            .OrderByDescending(a => a.Timestamp)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task<List<AuditLog>> GetTenantAuditLogsAsync(Guid tenantId)
    {
        return _context.AuditLogs
            .Include(a => a.Expense)
                .ThenInclude(expense => expense!.User)
            .Where(a => a.Expense != null && a.Expense.TenantId == tenantId)
            .OrderByDescending(a => a.Timestamp)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
}
