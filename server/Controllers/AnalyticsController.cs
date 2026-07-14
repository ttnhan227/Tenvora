using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

/// <summary>
/// Phase 4 — Advanced Analytics endpoints:
///   GET  api/analytics/department-budget-pool   — department spend vs. pooled budget
///   GET  api/analytics/seasonal-adjustments     — seasonal spend index per calendar month
///   GET  api/analytics/kpi-dashboard            — custom KPI dashboard (spend / risk / compliance / efficiency)
/// </summary>
[ApiController]
[Authorize(Roles = "Owner,Manager")]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAdvancedAnalyticsService _analyticsService;

    public AnalyticsController(IAdvancedAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    /// <summary>
    /// Department Budget Pooling — groups employee spend by category/department
    /// and shows how each department's budget is utilised.
    /// </summary>
    [HttpGet("department-budget-pool")]
    public async Task<IActionResult> GetDepartmentBudgetPool()
    {
        var tenantId = User.GetTenantId();
        var result = await _analyticsService.GetDepartmentBudgetPoolAsync(tenantId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Seasonal Adjustment Factors — returns a month-by-month seasonal spend index
    /// derived from all historical expenses, plus a budget suggestion for the current month.
    /// </summary>
    [HttpGet("seasonal-adjustments")]
    public async Task<IActionResult> GetSeasonalAdjustments()
    {
        var tenantId = User.GetTenantId();
        var result = await _analyticsService.GetSeasonalAdjustmentsAsync(tenantId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Custom KPI Dashboard — returns categorized KPI metrics across
    /// spend, risk, compliance, and efficiency dimensions.
    /// </summary>
    [HttpGet("kpi-dashboard")]
    public async Task<IActionResult> GetKpiDashboard()
    {
        var tenantId = User.GetTenantId();
        var result = await _analyticsService.GetCustomKpiDashboardAsync(tenantId);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
