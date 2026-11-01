using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/products"), Authorize]
public sealed class ProductsController(IBusinessService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] bool? active = true,
        [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        if (page.HasValue)
        {
            return (await service.GetProductsPagedAsync(User.GetTenantId(), search, active, page.Value, pageSize ?? 20)).ToActionResult();
        }
        return (await service.GetProductsAsync(User.GetTenantId(), search, active)).ToActionResult();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        (await service.GetProductAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Create(CreateProductRequest request) =>
        (await service.CreateProductAsync(User.GetTenantId(), request)).ToActionResult();

    [HttpPut("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, UpdateProductRequest request) =>
        (await service.UpdateProductAsync(User.GetTenantId(), id, request)).ToActionResult();

    [HttpDelete("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Delete(Guid id) =>
        (await service.DeleteProductAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpGet("units")]
    public async Task<IActionResult> GetUnits() =>
        (await service.GetDistinctProductUnitsAsync(User.GetTenantId())).ToActionResult();

    [HttpGet("adjustments")]
    public async Task<IActionResult> GetAdjustments([FromQuery] Guid? productId) =>
        (await service.GetStockAdjustmentsAsync(User.GetTenantId(), productId)).ToActionResult();

    [HttpGet("{id:guid}/defaults")]
    public async Task<IActionResult> GetDefaults(Guid id, [FromQuery] Guid? supplierId = null, CancellationToken ct = default) =>
        (await service.GetProductSmartDefaultsAsync(User.GetTenantId(), id, supplierId, ct)).ToActionResult();
}
