using Microsoft.AspNetCore.Http;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Ai;
using VeriSpend.Api.Dtos.Expenses;

namespace VeriSpend.Api.Services;

public interface IAiService
{
    Task<ApiResult<AiUploadResponse>> UploadReceiptAsync(IFormFile file, Guid tenantId);
    Task<ApiResult<ExpenseResponse>> ConfirmReceiptAsync(Guid tenantId, Guid userId, string performedBy, AiConfirmRequest request);
    Task<ApiResult<AiUsageResponse>> GetUsageAsync(Guid tenantId);
}
