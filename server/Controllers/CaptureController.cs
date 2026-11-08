using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/capture")]
[Authorize]
public sealed class CaptureController : ControllerBase
{
    private readonly ICaptureService _captureService;
    private readonly IObjectStorageService _storage;

    public CaptureController(ICaptureService captureService, IObjectStorageService storage)
    {
        _captureService = captureService;
        _storage = storage;
    }

    [HttpPost("analyze")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeDocumentRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var userRole = User.GetUserRole();

        var result = await _captureService.AnalyzeAndStageAsync(tenantId, userId, request, userRole, ct);
        return result.ToActionResult();
    }

    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpPost("upload-and-analyze")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAndAnalyze(
        [FromForm] IFormFile file,
        [FromForm] string? documentTypeHint,
        [FromForm] string? rawText,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResult.Fail("No file provided."));

        if (file.Length > 15_000_000)
            return BadRequest(ApiResult.Fail("File exceeds 15MB limit."));

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var userRole = User.GetUserRole();

        await using var stream = file.OpenReadStream();
        var uploadResult = await _storage.UploadAsync(stream, file.FileName, file.ContentType, $"tenvora/{tenantId}/invoices", ct);

        var request = new AnalyzeDocumentRequest(
            FileUrl: uploadResult.Url,
            RawText: rawText,
            DocumentTypeHint: documentTypeHint
        );

        var result = await _captureService.AnalyzeAndStageAsync(tenantId, userId, request, userRole, ct);
        return result.ToActionResult();
    }

    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var result = await _captureService.GetReviewQueueAsync(tenantId, ct);
        return result.ToActionResult();
    }

    [HttpPost("bulk-approve")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> BulkApprove([FromBody] BulkApproveCaptureRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var userRole = User.GetUserRole();

        var result = await _captureService.BulkApproveAsync(tenantId, userId, request, userRole, ct);
        return result.ToActionResult();
    }

    [HttpPost("queue/{actionId:guid}/reject")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> RejectDraft(Guid actionId, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        var result = await _captureService.RejectDraftAsync(tenantId, userId, actionId, ct);
        return result.ToActionResult();
    }

    [HttpGet("rules")]
    public async Task<IActionResult> GetRules(CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var result = await _captureService.GetExtractionRulesAsync(tenantId, ct);
        return result.ToActionResult();
    }

    [HttpPost("rules")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateRule([FromBody] CreateExtractionRuleRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var result = await _captureService.CreateExtractionRuleAsync(tenantId, request, ct);
        return result.ToActionResult();
    }

    [HttpDelete("rules/{ruleId:guid}")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> DeleteRule(Guid ruleId, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var result = await _captureService.DeleteExtractionRuleAsync(tenantId, ruleId, ct);
        return result.ToActionResult();
    }
}
