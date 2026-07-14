using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Common;
using VeriSpend.Api.Data;
using VeriSpend.Api.Dtos.Analytics;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

/// <summary>
/// Phase 4 — Advanced Analytics:
///   1. Department budget pooling: groups employee spend by category/department and pools budgets
///   2. Seasonal adjustment factors: computes month-by-month seasonal spend indices from historical data
///   3. Custom KPI dashboards: returns a rich set of KPI metrics across spend, risk, compliance, efficiency
/// </summary>
public sealed class AdvancedAnalyticsService : IAdvancedAnalyticsService
{
    private readonly IExpenseRepository _expenseRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IRiskAssessmentService _riskAssessmentService;
    private readonly AppDbContext _context;

    public AdvancedAnalyticsService(
        IExpenseRepository expenseRepository,
        ITenantRepository tenantRepository,
        IUserRepository userRepository,
        IRiskAssessmentService riskAssessmentService,
        AppDbContext context)
    {
        _expenseRepository = expenseRepository;
        _tenantRepository = tenantRepository;
        _userRepository = userRepository;
        _riskAssessmentService = riskAssessmentService;
        _context = context;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Department Budget Pooling
    // Strategy: treat each expense Category as a "department" and pool budgets.
    // The tenant's CategoryBudgets JSON stores per-category allocations.
    // ─────────────────────────────────────────────────────────────────────────────
    public async Task<ApiResult<DepartmentBudgetPoolResponse>> GetDepartmentBudgetPoolAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
            return ApiResult<DepartmentBudgetPoolResponse>.Fail("Tenant not found.");

        var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var budgets = ParseCategoryBudgets(tenant.CategoryBudgets);

        // Group by category (department)
        var departmentGroups = expenses
            .GroupBy(e => e.Category, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var departments = departmentGroups.Select(group =>
        {
            var category = group.Key;
            var budget = budgets.GetValueOrDefault(category, 0m);
            var totalSpend = group.Sum(e => e.Amount);
            var remaining = budget - totalSpend;
            var utilization = budget > 0 ? decimal.Round(totalSpend / budget * 100m, 1) : 0m;

            var employeeSummaries = group
                .GroupBy(e => e.User?.Email ?? "Unknown")
                .Select(empGroup =>
                {
                    var empSpend = empGroup.Sum(e => e.Amount);
                    var share = totalSpend > 0 ? decimal.Round(empSpend / totalSpend * 100m, 1) : 0m;
                    return new DepartmentEmployeeSummary(empGroup.Key, empSpend, empGroup.Count(), share);
                })
                .OrderByDescending(e => e.TotalSpend)
                .ToArray();

            return new DepartmentSpendSummary(
                category,
                budget,
                decimal.Round(totalSpend, 2),
                decimal.Round(remaining, 2),
                utilization,
                group.Count(),
                employeeSummaries);
        })
        .OrderByDescending(d => d.UtilizationPercent)
        .ToArray();

        var totalBudget = budgets.Values.Sum();
        var totalSpendAll = expenses.Sum(e => e.Amount);
        var totalRemaining = totalBudget - totalSpendAll;
        var overallUtilization = totalBudget > 0
            ? decimal.Round(totalSpendAll / totalBudget * 100m, 1)
            : 0m;

        var overBudgetDepts = departments
            .Where(d => d.BudgetAllocated > 0 && d.TotalSpend > d.BudgetAllocated)
            .Select(d => d.Department)
            .ToArray();

        return ApiResult<DepartmentBudgetPoolResponse>.Ok(new DepartmentBudgetPoolResponse(
            decimal.Round(totalBudget, 2),
            decimal.Round(totalSpendAll, 2),
            decimal.Round(totalRemaining, 2),
            overallUtilization,
            departments,
            overBudgetDepts));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Seasonal Adjustment Factors
    // Computes a seasonal index for each calendar month based on all historical
    // expense data. Index = monthAvg / overallAvg. >1.0 = above-average spend.
    // ─────────────────────────────────────────────────────────────────────────────
    public async Task<ApiResult<SeasonalAdjustmentResponse>> GetSeasonalAdjustmentsAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
            return ApiResult<SeasonalAdjustmentResponse>.Fail("Tenant not found.");

        var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var expenseList = expenses.ToList();

        if (expenseList.Count == 0)
        {
            return ApiResult<SeasonalAdjustmentResponse>.Ok(new SeasonalAdjustmentResponse(
                0m, Array.Empty<MonthlySeasonalFactor>(), "Normal", 1.0m, 0m,
                "Insufficient data to compute seasonal factors."));
        }

        // Group spend by calendar month (1–12) across all years
        var byMonth = expenseList
            .GroupBy(e => e.Date.Month)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        // Fill in months with 0 spend
        for (int m = 1; m <= 12; m++)
            byMonth.TryAdd(m, 0m);

        var nonZeroMonths = byMonth.Values.Where(v => v > 0).ToList();
        var avgMonthlySpend = nonZeroMonths.Count > 0
            ? nonZeroMonths.Average()
            : 1m;

        var monthNames = new[] { "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };

        var factors = Enumerable.Range(1, 12).Select(month =>
        {
            var spend = byMonth[month];
            var index = avgMonthlySpend > 0 ? decimal.Round(spend / avgMonthlySpend, 2) : 1.0m;
            var label = index >= 1.2m ? "Peak" : index <= 0.8m ? "Low" : "Normal";
            return new MonthlySeasonalFactor(monthNames[month], month, decimal.Round(spend, 2), index, label);
        }).ToArray();

        var currentMonth = DateTime.UtcNow.Month;
        var currentFactor = factors[currentMonth - 1];
        var budgetSuggestion = decimal.Round(avgMonthlySpend * currentFactor.SeasonalIndex, 2);

        var peakMonths = factors.Where(f => f.SeasonalLabel == "Peak").Select(f => f.Month).ToList();
        var insight = peakMonths.Count > 0
            ? $"Historical peak spend months: {string.Join(", ", peakMonths)}. Budget accordingly."
            : "Spend is relatively stable across the year with no pronounced seasonal peaks.";

        return ApiResult<SeasonalAdjustmentResponse>.Ok(new SeasonalAdjustmentResponse(
            decimal.Round(avgMonthlySpend, 2),
            factors,
            currentFactor.SeasonalLabel,
            currentFactor.SeasonalIndex,
            budgetSuggestion,
            insight));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Custom KPI Dashboard
    // Returns categorized KPI metrics: Spend, Risk, Compliance, Efficiency.
    // ─────────────────────────────────────────────────────────────────────────────
    public async Task<ApiResult<CustomKpiDashboardResponse>> GetCustomKpiDashboardAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
            return ApiResult<CustomKpiDashboardResponse>.Fail("Tenant not found.");

        var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var expenseList = expenses.ToList();
        var assessments = _riskAssessmentService.EvaluateExpenses(expenseList, tenant.MaxSpendLimit, expenseList);

        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1);
        var lastMonthStart = thisMonthStart.AddMonths(-1);

        var thisMonthExpenses = expenseList.Where(e => e.Date >= thisMonthStart).ToList();
        var lastMonthExpenses = expenseList.Where(e => e.Date >= lastMonthStart && e.Date < thisMonthStart).ToList();

        var thisMonthSpend = thisMonthExpenses.Sum(e => e.Amount);
        var lastMonthSpend = lastMonthExpenses.Sum(e => e.Amount);
        var spendTrend = lastMonthSpend > 0
            ? decimal.Round((thisMonthSpend - lastMonthSpend) / lastMonthSpend * 100m, 1)
            : 0m;

        var budgets = ParseCategoryBudgets(tenant.CategoryBudgets);
        var totalBudget = budgets.Values.Sum();

        // ── Spend KPIs ──
        var spendKpis = new List<KpiMetric>
        {
            new("Total Spend This Month", thisMonthSpend.ToString("F2"), "USD",
                spendTrend > 0 ? "up" : spendTrend < 0 ? "down" : "stable", spendTrend, "spend"),
            new("Total Spend Last Month", lastMonthSpend.ToString("F2"), "USD", null, null, "spend"),
            new("Avg Expense Amount", expenseList.Count > 0
                ? decimal.Round(expenseList.Average(e => e.Amount), 2).ToString("F2") : "0.00", "USD", null, null, "spend"),
            new("Total Expenses All-Time", expenseList.Sum(e => e.Amount).ToString("F2"), "USD", null, null, "spend"),
            new("Expense Count This Month", thisMonthExpenses.Count.ToString(), "expenses", null, null, "spend"),
            new("Budget Utilization", totalBudget > 0
                ? decimal.Round(thisMonthSpend / totalBudget * 100m, 1).ToString("F1") : "N/A", "%", null, null, "spend"),
        };

        // ── Risk KPIs ──
        var highRiskCount = assessments.Values.Count(a => a.RiskLevel == "High");
        var flaggedCount = expenseList.Count(e => e.Flagged);
        var flaggedThisMonth = thisMonthExpenses.Count(e => e.Flagged);
        var totalThisMonth = thisMonthExpenses.Count;
        var flagRate = totalThisMonth > 0 ? decimal.Round((decimal)flaggedThisMonth / totalThisMonth * 100m, 1) : 0m;

        var riskKpis = new List<KpiMetric>
        {
            new("High-Risk Expenses", highRiskCount.ToString(), "expenses", null, null, "risk"),
            new("Flagged This Month", flaggedThisMonth.ToString(), "expenses", null, null, "risk"),
            new("Flag Rate This Month", flagRate.ToString("F1"), "%",
                flagRate > 20 ? "up" : "stable", flagRate, "risk"),
            new("Total Flagged All-Time", flaggedCount.ToString(), "expenses", null, null, "risk"),
            new("Auto-Approval Eligibility", expenseList.Count > 0
                ? decimal.Round((decimal)expenseList.Count(e => e.Amount <= tenant.AutoApprovalMaxAmount) / expenseList.Count * 100m, 1).ToString("F1")
                : "0.0", "%", null, null, "risk"),
        };

        // ── Compliance KPIs ──
        var auditLogs = await _context.AuditLogs.Where(a => a.Expense != null && a.Expense.TenantId == tenantId).AsNoTracking().ToListAsync();
        var approvedCount = expenseList.Count(e => e.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase));
        var rejectedCount = expenseList.Count(e => e.Status.Equals("Rejected", StringComparison.OrdinalIgnoreCase));
        var pendingCount = expenseList.Count(e => e.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase));
        var approvalRate = (approvedCount + rejectedCount) > 0
            ? decimal.Round((decimal)approvedCount / (approvedCount + rejectedCount) * 100m, 1)
            : 0m;

        var feedbackCount = await _context.ExpenseReviewFeedback
            .CountAsync(f => f.TenantId == tenantId);

        var complianceKpis = new List<KpiMetric>
        {
            new("Approval Rate", approvalRate.ToString("F1"), "%",
                approvalRate > 80 ? "up" : "down", approvalRate, "compliance"),
            new("Pending Review", pendingCount.ToString(), "expenses", null, null, "compliance"),
            new("Total Audit Log Entries", auditLogs.Count.ToString(), "entries", null, null, "compliance"),
            new("Manager Corrections", feedbackCount.ToString(), "corrections", null, null, "compliance"),
            new("Rejected Expenses", rejectedCount.ToString(), "expenses", null, null, "compliance"),
        };

        // ── Efficiency KPIs ──
        var submittedLogs = auditLogs.Where(a => a.Action.Equals("Submitted", StringComparison.OrdinalIgnoreCase)).ToList();
        var decidedLogs = auditLogs.Where(a =>
            a.Action.Equals("Approved", StringComparison.OrdinalIgnoreCase) ||
            a.Action.Equals("Rejected", StringComparison.OrdinalIgnoreCase)).ToList();

        var turnaroundHours = new List<double>();
        foreach (var log in decidedLogs)
        {
            if (!log.ExpenseId.HasValue) continue;
            var submitted = submittedLogs.FirstOrDefault(s => s.ExpenseId == log.ExpenseId);
            if (submitted != null)
                turnaroundHours.Add((log.Timestamp - submitted.Timestamp).TotalHours);
        }

        var avgTurnaround = turnaroundHours.Count > 0
            ? decimal.Round((decimal)turnaroundHours.Average(), 1)
            : 0m;
        var slaBreached = turnaroundHours.Count(h => h > 48);
        var slaRate = turnaroundHours.Count > 0
            ? decimal.Round((decimal)slaBreached / turnaroundHours.Count * 100m, 1)
            : 0m;

        var uniqueSubmitters = expenseList.Select(e => e.UserId).Distinct().Count();
        var avgExpensesPerEmployee = uniqueSubmitters > 0
            ? decimal.Round((decimal)expenseList.Count / uniqueSubmitters, 1)
            : 0m;

        var efficiencyKpis = new List<KpiMetric>
        {
            new("Avg Review Turnaround", avgTurnaround.ToString("F1"), "hours",
                avgTurnaround < 24 ? "up" : avgTurnaround > 48 ? "down" : "stable", avgTurnaround, "efficiency"),
            new("SLA Breach Rate", slaRate.ToString("F1"), "%",
                slaRate > 10 ? "up" : "stable", slaRate, "efficiency"),
            new("Active Submitters", uniqueSubmitters.ToString(), "employees", null, null, "efficiency"),
            new("Avg Expenses per Employee", avgExpensesPerEmployee.ToString("F1"), "expenses", null, null, "efficiency"),
            new("Total Expenses Processed", expenseList.Count.ToString(), "expenses", null, null, "efficiency"),
        };

        return ApiResult<CustomKpiDashboardResponse>.Ok(new CustomKpiDashboardResponse(
            spendKpis.ToArray(),
            riskKpis.ToArray(),
            complianceKpis.ToArray(),
            efficiencyKpis.ToArray(),
            DateTime.UtcNow));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────
    private static Dictionary<string, decimal> ParseCategoryBudgets(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, decimal>>(json,
                       new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                   ?? new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        }
    }
}
