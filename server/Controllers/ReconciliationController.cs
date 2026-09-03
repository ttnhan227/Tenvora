using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReconciliationController : ControllerBase
{
    private readonly IReconciliationService _reconciliationService;

    public ReconciliationController(IReconciliationService reconciliationService)
    {
        _reconciliationService = reconciliationService;
    }

    [HttpPost("run")]
    [Authorize(Roles = "TenantAdmin,OperationsManager,ComplianceOfficer")]
    public async Task<IActionResult> RunReconciliation([FromBody] TriggerReconciliationRequest? request)
    {
        var tenantId = User.GetTenantId();
        var result = await _reconciliationService.RunReconciliationAsync(tenantId, request?.Notes);
        return Ok(ApiResult<ReconciliationResponse>.Ok(result));
    }

    [HttpGet("runs")]
    public async Task<IActionResult> GetRuns()
    {
        var tenantId = User.GetTenantId();
        var runs = await _reconciliationService.GetReconciliationRunsAsync(tenantId);
        return Ok(ApiResult<List<ReconciliationResponse>>.Ok(runs));
    }

    [HttpGet("runs/{id:guid}")]
    public async Task<IActionResult> GetRun(Guid id)
    {
        var tenantId = User.GetTenantId();
        var run = await _reconciliationService.GetReconciliationRunByIdAsync(tenantId, id);
        if (run == null)
            return NotFound(ApiResult<ReconciliationResponse>.Fail("Reconciliation run not found."));

        return Ok(ApiResult<ReconciliationResponse>.Ok(run));
    }
}
