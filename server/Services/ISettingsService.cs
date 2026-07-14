using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Budget;
using VeriSpend.Api.Dtos.Settings;

namespace VeriSpend.Api.Services;

public interface ISettingsService
{
    Task<ApiResult<CompanySettingsResponse>> GetCompanySettingsAsync(Guid tenantId);
    Task<ApiResult> UpdatePolicyAsync(Guid tenantId, UpdatePolicyRequest request);
    Task<ApiResult<List<CategoryBudget>>> GetCategoryBudgetsAsync(Guid tenantId);
    Task<ApiResult> UpdateCategoryBudgetsAsync(Guid tenantId, UpdateCategoryBudgetsRequest request);
    Task<ApiResult<AutoApprovalRulesResponse>> GetAutoApprovalRulesAsync(Guid tenantId);
    Task<ApiResult> UpdateAutoApprovalRulesAsync(Guid tenantId, UpdateAutoApprovalRulesRequest request);
    Task<ApiResult<PolicySimulationResponse>> SimulatePolicyAsync(Guid tenantId, PolicySimulationRequest request);
    Task<ApiResult<NotificationSettingsResponse>> GetNotificationSettingsAsync(Guid tenantId);
    Task<ApiResult> UpdateNotificationSettingsAsync(Guid tenantId, UpdateNotificationSettingsRequest request);
}
