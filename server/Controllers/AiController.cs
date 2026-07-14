using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Ai;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;
    private readonly ILogger<AiController> _logger;
    private readonly IAiCopilotService _copilot;

    public AiController(IAiService aiService, ILogger<AiController> logger, IAiCopilotService copilot)
    {
        _aiService = aiService;
        _logger = logger;
        _copilot = copilot;
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [Consumes("multipart/form-data")]
    [HttpPost("upload")]
    public async Task<IActionResult> UploadReceipt([FromForm] AiUploadRequest request)
    {
        var tenantId = User.GetTenantId();
        _logger.LogInformation(
            "Receipt upload request received. TenantId={TenantId}, FileName={FileName}, ContentType={ContentType}, Length={Length}",
            tenantId,
            request.File?.FileName,
            request.File?.ContentType,
            request.File?.Length ?? 0);

        var result = await _aiService.UploadReceiptAsync(request.File, tenantId);

        _logger.LogInformation(
            "Receipt upload request completed. TenantId={TenantId}, Success={Success}, Error={Error}",
            tenantId,
            result.Success,
            result.Error);

        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmReceipt(AiConfirmRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var performedBy = User.GetUserEmail();
        _logger.LogInformation(
            "Receipt confirmation request received. TenantId={TenantId}, UserId={UserId}, Merchant={Merchant}, Amount={Amount}, FileUrl={FileUrl}",
            tenantId,
            userId,
            request.Merchant,
            request.Amount,
            request.FileUrl);

        var result = await _aiService.ConfirmReceiptAsync(tenantId, userId, performedBy, request);

        _logger.LogInformation(
            "Receipt confirmation completed. TenantId={TenantId}, UserId={UserId}, Success={Success}, Error={Error}",
            tenantId,
            userId,
            result.Success,
            result.Error);

        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage()
    {
        var tenantId = User.GetTenantId();
        var result = await _aiService.GetUsageAsync(tenantId);
        return Ok(result);
    }

    [HttpPost("copilot")]
    public async Task<IActionResult> AskCopilot(AiCopilotRequest request)
    {
        var result = await _copilot.AskAsync(User.GetTenantId(), User.GetUserId(), User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Member", request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
