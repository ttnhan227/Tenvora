using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Expenses;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/expenses")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyExpenses()
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var role = User.GetUserRole();

        var result = await _expenseService.GetMyExpensesAsync(tenantId, role, userId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetExpense(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var role = User.GetUserRole();

        var result = await _expenseService.GetExpenseAsync(id, tenantId, role, userId);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : result.Error == "Forbidden" ? Forbid() : BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [HttpPost]
    public async Task<IActionResult> CreateExpense(ExpenseCreateRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var performedBy = User.GetUserEmail();
        var result = await _expenseService.CreateExpenseAsync(tenantId, userId, performedBy, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetExpense), new { id = result.Data!.Id }, result);
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpense(Guid id, ExpenseUpdateRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var performedBy = User.GetUserEmail();
        var result = await _expenseService.UpdateExpenseAsync(id, tenantId, userId, performedBy, request);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : result.Error == "Forbidden" ? Forbid() : BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [HttpPut("bulk-update")]
    public async Task<IActionResult> BulkUpdateExpenses([FromBody] IEnumerable<ExpenseBulkUpdateRequest> requests)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var performedBy = User.GetUserEmail();
        var result = await _expenseService.BulkUpdateExpensesAsync(tenantId, userId, performedBy, requests);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitExpense(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var role = User.GetUserRole();
        var performedBy = User.GetUserEmail();

        var result = await _expenseService.SubmitExpenseAsync(id, tenantId, userId, role, performedBy);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : result.Error == "Forbidden" ? Forbid() : BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize(Roles = "Owner,Manager,Member")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var role = User.GetUserRole();
        var performedBy = User.GetUserEmail();

        var result = await _expenseService.DeleteExpenseAsync(id, tenantId, userId, role, performedBy);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : result.Error == "Forbidden" ? Forbid() : BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetExpenseStats()
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();
        var role = User.GetUserRole();

        var result = await _expenseService.GetExpenseStatsAsync(tenantId, role, userId);
        return Ok(result);
    }
}
