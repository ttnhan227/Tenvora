using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IExpenseService
{
    Task<ApiResult<List<ExpenseDto>>> GetAsync(Guid tenantId, string? search, string? category, string? status, DateTime? from, DateTime? to);
    Task<ApiResult<ExpenseSummaryDto>> GetSummaryAsync(Guid tenantId, DateTime? from, DateTime? to);
    Task<ApiResult<ExpenseDto>> CreateAsync(Guid tenantId, string idempotencyKey, CreateExpenseRequest request);
    Task<ApiResult<ExpenseDto>> VoidAsync(Guid tenantId, Guid id, VoidExpenseRequest request);
}
