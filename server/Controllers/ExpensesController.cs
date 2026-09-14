using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/expenses"), Authorize]
public sealed class ExpensesController(IExpenseService expenses) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] string? category, [FromQuery] string? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        (await expenses.GetAsync(User.GetTenantId(), search, category, status, from, to)).ToActionResult();

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        (await expenses.GetSummaryAsync(User.GetTenantId(), from, to)).ToActionResult();

    [HttpPost, EnableRateLimiting("payments-rate-limit"), Authorize(Roles = "SoloFreelancer,TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Create([FromHeader(Name = "Idempotency-Key")] string? key, [FromBody] CreateExpenseRequest request)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 100) return BadRequest(ApiResult.Fail("The 'Idempotency-Key' header is required."));
        return (await expenses.CreateAsync(User.GetTenantId(), key, request)).ToActionResult();
    }

    [HttpPost("{id:guid}/void"), Authorize(Roles = "SoloFreelancer,TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Void(Guid id, [FromBody] VoidExpenseRequest? request) =>
        (await expenses.VoidAsync(User.GetTenantId(), id, request ?? new(null))).ToActionResult();
}
