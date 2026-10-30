using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface ICaptureService
{
    Task<ApiResult<CaptureResultDto>> AnalyzeAndStageAsync(
        Guid tenantId,
        Guid userId,
        AnalyzeDocumentRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default);

    Task<ApiResult<List<CaptureResultDto>>> GetReviewQueueAsync(
        Guid tenantId,
        CancellationToken ct = default);

    Task<ApiResult<BulkApproveResultDto>> BulkApproveAsync(
        Guid tenantId,
        Guid userId,
        BulkApproveCaptureRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default);

    Task<ApiResult<bool>> RejectDraftAsync(
        Guid tenantId,
        Guid userId,
        Guid actionId,
        CancellationToken ct = default);

    Task<ApiResult<List<TenantExtractionRuleDto>>> GetExtractionRulesAsync(
        Guid tenantId,
        CancellationToken ct = default);

    Task<ApiResult<TenantExtractionRuleDto>> CreateExtractionRuleAsync(
        Guid tenantId,
        CreateExtractionRuleRequest request,
        CancellationToken ct = default);

    Task<ApiResult<bool>> DeleteExtractionRuleAsync(
        Guid tenantId,
        Guid ruleId,
        CancellationToken ct = default);
}
