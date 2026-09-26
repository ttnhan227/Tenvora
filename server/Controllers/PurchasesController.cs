using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/purchases"), Authorize]
public sealed class PurchasesController(IBusinessService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] Guid? supplierId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        (await service.GetPurchasesAsync(User.GetTenantId(), search, supplierId, from, to)).ToActionResult();
    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Create([FromHeader(Name = "Idempotency-Key")] string? key, CreatePurchaseRequest request) =>
        (await service.CreatePurchaseAsync(User.GetTenantId(), key?.Trim() ?? string.Empty, request)).ToActionResult();
    [HttpPost("{id:guid}/payments"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Pay(Guid id, [FromHeader(Name = "Idempotency-Key")] string? key, RecordPurchasePaymentRequest request) =>
        (await service.RecordPurchasePaymentAsync(User.GetTenantId(), id, key?.Trim() ?? string.Empty, request)).ToActionResult();
}
