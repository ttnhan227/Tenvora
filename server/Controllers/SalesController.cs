using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/sales"), Authorize]
public sealed class SalesController(IBusinessService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] Guid? customerId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        (await service.GetSalesAsync(User.GetTenantId(), search, customerId, from, to)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        (await service.GetSaleAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Create([FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, CreateSaleRequest request) =>
        (await service.CreateSaleAsync(User.GetTenantId(), idempotencyKey?.Trim() ?? string.Empty, request)).ToActionResult();

    [HttpPost("{id:guid}/payments"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> RecordPayment(Guid id, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        RecordBusinessPaymentRequest request) =>
        (await service.RecordPaymentAsync(User.GetTenantId(), id, idempotencyKey?.Trim() ?? string.Empty, request)).ToActionResult();

    [HttpPost("{id:guid}/void"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Void(Guid id) =>
        (await service.VoidSaleAsync(User.GetTenantId(), id)).ToActionResult();
}
