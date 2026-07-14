using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public interface IAuditLogService
{
    Task LogExpenseCreatedAsync(Expense expense, string performedBy);
    Task LogExpenseUpdatedAsync(Expense before, Expense after, string performedBy);
    Task LogExpenseSubmittedAsync(Expense expense, string performedBy);
    Task LogExpenseApprovedAsync(Expense expense, string performedBy);
    Task LogExpenseRejectedAsync(Expense expense, string performedBy, string reason);
    Task LogExpenseDeletedAsync(Expense expense, string performedBy);
}