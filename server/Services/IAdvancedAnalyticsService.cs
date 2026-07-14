using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Analytics;

namespace VeriSpend.Api.Services;

public interface IAdvancedAnalyticsService
{
    Task<ApiResult<DepartmentBudgetPoolResponse>> GetDepartmentBudgetPoolAsync(Guid tenantId);
    Task<ApiResult<SeasonalAdjustmentResponse>> GetSeasonalAdjustmentsAsync(Guid tenantId);
    Task<ApiResult<CustomKpiDashboardResponse>> GetCustomKpiDashboardAsync(Guid tenantId);
}
