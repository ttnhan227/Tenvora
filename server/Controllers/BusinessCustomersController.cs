using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/customers"), Authorize]
public sealed class BusinessCustomersController(IBusinessService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] string? status = "Active") =>
        (await service.GetCustomersAsync(User.GetTenantId(), search, status)).ToActionResult();

    [HttpGet("{id:guid}")]
    [HttpGet("{id:guid}/history")]
    public async Task<IActionResult> GetById(Guid id) =>
        (await service.GetCustomerAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Create(CreateBusinessCustomerRequest request) =>
        (await service.CreateCustomerAsync(User.GetTenantId(), request)).ToActionResult();

    [HttpPut("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, UpdateBusinessCustomerRequest request) =>
        (await service.UpdateCustomerAsync(User.GetTenantId(), id, request)).ToActionResult();

    [HttpPost("{id:guid}/payments"), Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> RecordAccountPayment(Guid id, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, RecordCustomerAccountPaymentRequest request) =>
        (await service.RecordCustomerAccountPaymentAsync(User.GetTenantId(), id, idempotencyKey?.Trim() ?? string.Empty, request)).ToActionResult();
}

