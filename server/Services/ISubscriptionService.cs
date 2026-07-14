using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Subscription;

namespace VeriSpend.Api.Services;

public interface ISubscriptionService
{
    Task<ApiResult<GetPlansResponse>> GetAvailablePlansAsync();
    Task<ApiResult<SubscriptionResponse>> SubscribeAsync(Guid tenantId, SubscribeRequest request);
    Task<ApiResult<CurrentSubscriptionResponse>> GetCurrentSubscriptionAsync(Guid tenantId);
    Task<ApiResult<BillingHistoryItemResponse[]>> GetBillingHistoryAsync(Guid tenantId);
    Task<ApiResult> CancelSubscriptionAsync(Guid tenantId);
    Task<ApiResult<SubscriptionResponse>> UpgradeSubscriptionAsync(Guid tenantId, UpgradeSubscriptionRequest request);
}
