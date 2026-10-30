using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/business-expenses"), Authorize]
public sealed class BusinessExpensesController(IBusinessService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] string? category,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        if (page.HasValue)
        {
            return (await service.GetBusinessExpensesPagedAsync(User.GetTenantId(), search, category, from, to, page.Value, pageSize ?? 20)).ToActionResult();
        }
        return (await service.GetBusinessExpensesAsync(User.GetTenantId(), search, category, from, to)).ToActionResult();
    }
    [HttpPost, Authorize(Roles = "TenantAdmin,OperationsManager"), EnableRateLimiting("payments-rate-limit")]
    public async Task<IActionResult> Create([FromHeader(Name = "Idempotency-Key")] string? key, CreateBusinessExpenseRequest request) =>
        (await service.CreateBusinessExpenseAsync(User.GetTenantId(), key?.Trim() ?? string.Empty, request)).ToActionResult();

    [HttpPut("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, UpdateBusinessExpenseRequest request) =>
        (await service.UpdateBusinessExpenseAsync(User.GetTenantId(), id, request)).ToActionResult();

    [HttpDelete("{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> Delete(Guid id) =>
        (await service.DeleteBusinessExpenseAsync(User.GetTenantId(), id)).ToActionResult();

    [HttpGet("recurring")]
    public async Task<IActionResult> GetRecurring(CancellationToken ct) =>
        (await service.GetRecurringExpenseTemplatesAsync(User.GetTenantId(), ct)).ToActionResult();

    [HttpPost("recurring"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateRecurring(CreateRecurringExpenseTemplateRequest request, CancellationToken ct) =>
        (await service.CreateRecurringExpenseTemplateAsync(User.GetTenantId(), User.GetUserId(), request, ct)).ToActionResult();

    [HttpPut("recurring/{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> UpdateRecurring(Guid id, UpdateRecurringExpenseTemplateRequest request, CancellationToken ct) =>
        (await service.UpdateRecurringExpenseTemplateAsync(User.GetTenantId(), id, request, ct)).ToActionResult();

    [HttpDelete("recurring/{id:guid}"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> DeleteRecurring(Guid id, CancellationToken ct) =>
        (await service.DeleteRecurringExpenseTemplateAsync(User.GetTenantId(), id, ct)).ToActionResult();

    [HttpPost("recurring/process-due"), Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> ProcessDueRecurring(CancellationToken ct) =>
        (await service.ProcessDueRecurringExpensesAsync(User.GetTenantId(), User.GetUserId(), ct)).ToActionResult();
}
