using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public interface IExpenseRepository
{
    Task<List<Expense>> GetExpensesAsync(Guid tenantId, string role, Guid userId);
    Task<Expense?> GetByIdAsync(Guid id, Guid tenantId);
    Task<List<Expense>> GetPendingExpensesAsync(Guid tenantId);
    Task<List<Expense>> GetPendingExpensesForUpdateAsync(Guid tenantId);
    Task<List<Expense>> GetTenantExpensesAsync(Guid tenantId);
    Task<int> CountReceiptsThisMonthAsync(Guid tenantId, DateTime monthStart);
    Task AddAsync(Expense expense);
    Task SaveChangesAsync();
}
