using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Expenses;

namespace VeriSpend.Api.Services;

public interface IExpenseService
{
    Task<ApiResult<IEnumerable<ExpenseResponse>>> GetMyExpensesAsync(Guid tenantId, string role, Guid userId);
    Task<ApiResult<ExpenseResponse>> GetExpenseAsync(Guid id, Guid tenantId, string role, Guid userId);
    Task<ApiResult<ExpenseResponse>> CreateExpenseAsync(Guid tenantId, Guid userId, string performedBy, ExpenseCreateRequest request);
    Task<ApiResult<ExpenseResponse>> UpdateExpenseAsync(Guid id, Guid tenantId, Guid userId, string performedBy, ExpenseUpdateRequest request);
    Task<ApiResult<IEnumerable<ExpenseResponse>>> BulkUpdateExpensesAsync(Guid tenantId, Guid userId, string performedBy, IEnumerable<ExpenseBulkUpdateRequest> requests);
    Task<ApiResult<ExpenseResponse>> SubmitExpenseAsync(Guid id, Guid tenantId, Guid userId, string role, string performedBy);
    Task<ApiResult> DeleteExpenseAsync(Guid id, Guid tenantId, Guid userId, string role, string performedBy);
    Task<ApiResult<ExpenseStatsResponse>> GetExpenseStatsAsync(Guid tenantId, string role, Guid userId);
    Task<int> ProcessAutoApprovalsAsync(Guid tenantId);
}
