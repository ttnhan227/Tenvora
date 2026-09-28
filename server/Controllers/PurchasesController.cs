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
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] Guid? supplierId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        if (page.HasValue)
        {
            return (await service.GetPurchasesPagedAsync(User.GetTenantId(), search, supplierId, from, to, page.Value, pageSize ?? 20)).ToActionResult();
        }
        return (await service.GetPurchasesAsync(User.GetTenantId(), search, supplierId, from, to)).ToActionResult();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        (await service.GetPurchaseAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Create([FromHeader(Name = "Idempotency-Key")] string? key, CreatePurchaseRequest request) =>
        (await service.CreatePurchaseAsync(User.GetTenantId(), key?.Trim() ?? string.Empty, request)).ToActionResult();

    [HttpPost("{id:guid}/payments"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Pay(Guid id, [FromHeader(Name = "Idempotency-Key")] string? key, RecordPurchasePaymentRequest request) =>
        (await service.RecordPurchasePaymentAsync(User.GetTenantId(), id, key?.Trim() ?? string.Empty, request)).ToActionResult();

    [HttpPost("{id:guid}/payments/{paymentId:guid}/reverse"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> ReversePayment(Guid id, Guid paymentId, [FromBody] ReversePaymentRequest request)
    {
        var userId = User.GetUserId();
        return (await service.ReversePurchasePaymentAsync(User.GetTenantId(), id, paymentId, userId == Guid.Empty ? null : userId, request)).ToActionResult();
    }

    [HttpPost("{id:guid}/void"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Void(Guid id, [FromBody] VoidPurchaseRequest? request = null)
    {
        var userId = User.GetUserId();
        return (await service.VoidPurchaseAsync(User.GetTenantId(), id, userId == Guid.Empty ? null : userId, request)).ToActionResult();
    }
}
