using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Manager;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Authorize(Roles = "Owner,Manager")]
[Route("api/manager")]
public class ManagerController : ControllerBase
{
    private readonly IManagerService _managerService;

    public ManagerController(IManagerService managerService)
    {
        _managerService = managerService;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingExpenses()
    {
        var tenantId = User.GetTenantId();
        var result = await _managerService.GetPendingExpensesAsync(tenantId);
        return Ok(result);
    }

    [HttpGet("audit-insights")]
    public async Task<IActionResult> GetAuditInsights()
    {
        var tenantId = User.GetTenantId();
        var result = await _managerService.GetAuditInsightsAsync(tenantId);
        return Ok(result);
    }

    [HttpPost("approve/{id}")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var tenantId = User.GetTenantId();
        var performedBy = User.GetUserEmail();
        var result = await _managerService.ApproveAsync(id, tenantId, performedBy);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("reject/{id}")]
    public async Task<IActionResult> Reject(Guid id, RejectExpenseRequest request)
    {
        var tenantId = User.GetTenantId();
        var performedBy = User.GetUserEmail();
        var result = await _managerService.RejectAsync(id, tenantId, request, performedBy);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("feedback/{id}")]
    public async Task<IActionResult> SubmitReviewFeedback(Guid id, SubmitReviewFeedbackRequest request)
    {
        var tenantId = User.GetTenantId();
        var performedBy = User.GetUserEmail();
        var result = await _managerService.SubmitReviewFeedbackAsync(id, tenantId, request, performedBy);
        if (!result.Success)
        {
            return result.Error == "Expense not found." ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("audit-trail/{id}")]
    public async Task<IActionResult> AuditTrail(Guid id)
    {
        var tenantId = User.GetTenantId();
        var result = await _managerService.GetAuditTrailAsync(id, tenantId);
        return result.Success ? Ok(result) : NotFound(result);
    }

     [HttpGet("export")]
     public async Task<IActionResult> ExportTenantExpenses()
     {
         var tenantId = User.GetTenantId();
         var fileResult = await _managerService.ExportTenantExpensesAsync(tenantId);
         return fileResult;
     }

     [HttpGet("export/quickbooks")]
     public async Task<IActionResult> ExportToQuickBooks()
     {
         var tenantId = User.GetTenantId();
         var fileResult = await _managerService.ExportToQuickBooksAsync(tenantId);
         return fileResult;
     }

     [HttpGet("export/xero")]
     public async Task<IActionResult> ExportToXero()
     {
         var tenantId = User.GetTenantId();
         var fileResult = await _managerService.ExportToXeroAsync(tenantId);
         return fileResult;
     }

     [HttpGet("budget-prediction")]
     public async Task<IActionResult> GetBudgetPrediction()
     {
         var tenantId = User.GetTenantId();
         var result = await _managerService.GetBudgetPredictionAsync(tenantId);
         return Ok(result);
     }
 }
