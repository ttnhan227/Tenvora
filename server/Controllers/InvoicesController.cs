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
    public async Task<IActionResult> PayInvoice(Guid id, [FromBody] PayInvoiceRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _invoiceService.PayInvoiceAsync(tenantId, id, request);
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
