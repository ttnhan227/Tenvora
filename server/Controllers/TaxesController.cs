using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaxesController : ControllerBase
{
    private readonly ITaxService _taxService;

    public TaxesController(ITaxService taxService)
    {
        _taxService = taxService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetTaxSummary()
    {
        var tenantId = User.GetTenantId();
        var result = await _taxService.GetTaxSummaryAsync(tenantId);
        return result.ToActionResult();
    }

    [HttpPatch("settings")]
    [HttpPut("settings")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> UpdateTaxSettings([FromBody] UpdateTaxSettingsRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _taxService.UpdateTaxSettingsAsync(tenantId, request);
        return result.ToActionResult();
    }

    [HttpPost("transfer")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> ManualTaxTransfer([FromBody] ManualTaxTransferRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _taxService.ManualTaxTransferAsync(tenantId, request);
        return result.ToActionResult();
    }
}
