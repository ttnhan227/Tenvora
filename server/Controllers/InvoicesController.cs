using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? status = null, [FromQuery] Guid? clientId = null)
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.GetInvoicesAsync(tenantId, status, clientId);
        return result.ToActionResult();
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetInvoiceStats()
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.GetInvoiceStatsAsync(tenantId);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetInvoiceById(Guid id)
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.GetInvoiceByIdAsync(tenantId, id);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.CreateInvoiceAsync(tenantId, request);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/send")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> SendInvoice(Guid id)
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.SendInvoiceAsync(tenantId, id);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/pay")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> PayInvoice(Guid id, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, [FromBody] PayInvoiceRequest request)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 100)
            return BadRequest(ApiResult.Fail("The 'Idempotency-Key' header is required."));
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.PayInvoiceAsync(tenantId, id, idempotencyKey.Trim(), request);
        return result.ToActionResult();
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CancelInvoice(Guid id, [FromBody] CancelInvoiceRequest? request)
    {
        var result = await _invoiceService.CancelInvoiceAsync(User.GetTenantId(), id, request ?? new(null));
        return result.ToActionResult();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> DeleteInvoice(Guid id)
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.DeleteInvoiceAsync(tenantId, id);
        return result.ToActionResult();
    }
}
