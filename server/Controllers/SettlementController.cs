using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettlementController : ControllerBase
{
    private readonly ISettlementService _settlementService;

    public SettlementController(ISettlementService settlementService)
    {
        _settlementService = settlementService;
    }

    [HttpPost("batches/create")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateBatch([FromQuery] string currency = "USD")
    {
        var tenantId = User.GetTenantId();
        var result = await _settlementService.CreateDailySettlementBatchAsync(tenantId, currency);
        return Ok(ApiResult<SettlementBatchResponse>.Ok(result));
    }

    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches()
    {
        var tenantId = User.GetTenantId();
        var batches = await _settlementService.GetBatchesAsync(tenantId);
        return Ok(ApiResult<List<SettlementBatchResponse>>.Ok(batches));
    }

    [HttpGet("batches/{id:guid}")]
    public async Task<IActionResult> GetBatch(Guid id)
    {
        var tenantId = User.GetTenantId();
        var batch = await _settlementService.GetBatchByIdAsync(tenantId, id);
        if (batch == null)
            return NotFound(ApiResult<SettlementBatchResponse>.Fail("Settlement batch not found."));

        return Ok(ApiResult<SettlementBatchResponse>.Ok(batch));
    }
}
