using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface ITaxService
{
    Task<ApiResult<TaxSummaryDto>> GetTaxSummaryAsync(Guid tenantId);
    Task<ApiResult<bool>> UpdateTaxSettingsAsync(Guid tenantId, UpdateTaxSettingsRequest request);
    Task<ApiResult<TaxTransferRecordDto>> ManualTaxTransferAsync(Guid tenantId, ManualTaxTransferRequest request);
}
