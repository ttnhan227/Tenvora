using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Manager;

namespace VeriSpend.Api.Services;

public interface IManagerService
{
    Task<ApiResult<IEnumerable<PendingExpenseResponse>>> GetPendingExpensesAsync(Guid tenantId);
    Task<ApiResult<AuditInsightsResponse>> GetAuditInsightsAsync(Guid tenantId);
    Task<ApiResult<ApproveExpenseResponse>> ApproveAsync(Guid id, Guid tenantId, string performedBy);
    Task<ApiResult> RejectAsync(Guid id, Guid tenantId, RejectExpenseRequest request, string performedBy);
    Task<ApiResult<ReviewFeedbackResponse>> SubmitReviewFeedbackAsync(Guid id, Guid tenantId, SubmitReviewFeedbackRequest request, string performedBy);
    Task<ApiResult<IEnumerable<AuditEntryResponse>>> GetAuditTrailAsync(Guid id, Guid tenantId);
    Task<FileContentResult> ExportTenantExpensesAsync(Guid tenantId);
    Task<FileContentResult> ExportToQuickBooksAsync(Guid tenantId);
    Task<FileContentResult> ExportToXeroAsync(Guid tenantId);
    Task<ApiResult<BudgetPredictionResponse>> GetBudgetPredictionAsync(Guid tenantId);
}

