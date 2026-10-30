using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/suppliers"), Authorize]
public sealed class SuppliersController(IBusinessService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] string? status = "Active",
        [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        if (page.HasValue)
        {
            return (await service.GetSuppliersPagedAsync(User.GetTenantId(), search, status, page.Value, pageSize ?? 20)).ToActionResult();
        }
        return (await service.GetSuppliersAsync(User.GetTenantId(), search, status)).ToActionResult();
    }
    [HttpGet("{id:guid}")] [HttpGet("{id:guid}/history")] public async Task<IActionResult> GetById(Guid id) =>
        (await service.GetSupplierAsync(User.GetTenantId(), id)).ToActionResult();
    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager")] public async Task<IActionResult> Create(CreateSupplierRequest request) =>
        (await service.CreateSupplierAsync(User.GetTenantId(), request)).ToActionResult();
    [HttpPut("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")] public async Task<IActionResult> Update(Guid id, UpdateSupplierRequest request) =>
        (await service.UpdateSupplierAsync(User.GetTenantId(), id, request)).ToActionResult();
    [HttpDelete("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")] public async Task<IActionResult> Delete(Guid id) =>
        (await service.DeleteSupplierAsync(User.GetTenantId(), id)).ToActionResult();
    [HttpPost("{id:guid}/payments"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> RecordAccountPayment(Guid id, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, RecordSupplierAccountPaymentRequest request) =>
        (await service.RecordSupplierAccountPaymentAsync(User.GetTenantId(), id, idempotencyKey?.Trim() ?? string.Empty, request)).ToActionResult();

    [HttpGet("{id:guid}/defaults")]
    public async Task<IActionResult> GetDefaults(Guid id, CancellationToken ct = default) =>
        (await service.GetSupplierSmartDefaultsAsync(User.GetTenantId(), id, ct)).ToActionResult();
}
