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
}
