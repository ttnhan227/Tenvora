using System.Text.Json;
using System.Linq;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Budget;
using VeriSpend.Api.Dtos.Manager;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public interface IBudgetGuardrailService
{
    Task<List<CategoryBudget>> GetCategoryBudgetsAsync(Tenant tenant, Dictionary<string, decimal> categorySpending);
    Task<ApiResult> SetCategoryBudgetsAsync(Tenant tenant, Dictionary<string, decimal> budgets);
    Task<List<BudgetAlert>> CheckBudgetAlertsAsync(Tenant tenant, Expense expense);
    Task<ApiResult<BudgetPredictionResponse>> GetBudgetPredictionAsync(Tenant tenant);
}

public sealed class BudgetGuardrailService : IBudgetGuardrailService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IExpenseRepository _expenseRepository;
    private readonly IAuditLogRepository _auditLogRepository;

    public BudgetGuardrailService(ITenantRepository tenantRepository, IExpenseRepository expenseRepository, IAuditLogRepository auditLogRepository)
    {
        _tenantRepository = tenantRepository;
        _expenseRepository = expenseRepository;
        _auditLogRepository = auditLogRepository;
    }

    public async Task<List<CategoryBudget>> GetCategoryBudgetsAsync(Tenant tenant, Dictionary<string, decimal> categorySpending)
    {
        var budgets = ParseCategoryBudgets(tenant.CategoryBudgets);
        var result = new List<CategoryBudget>();

        foreach (var kvp in budgets)
        {
            var spent = categorySpending.GetValueOrDefault(kvp.Key, 0m);
            var remaining = kvp.Value - spent;
            var usagePercentage = kvp.Value > 0 ? (int)((spent / kvp.Value) * 100) : 0;

            result.Add(new CategoryBudget(
                Category: kvp.Key,
                Limit: kvp.Value,
                Spent: spent,
                Remaining: Math.Max(0, remaining),
                UsagePercentage: Math.Min(usagePercentage, 100),
                IsNearLimit: usagePercentage >= 80 && usagePercentage < 100,
                IsAtLimit: usagePercentage >= 100
            ));
        }

        return result;
    }

    public async Task<ApiResult> SetCategoryBudgetsAsync(Tenant tenant, Dictionary<string, decimal> budgets)
    {
        tenant.CategoryBudgets = JsonSerializer.Serialize(budgets);
        await _tenantRepository.SaveChangesAsync();
        return ApiResult.Ok();
    }

    public async Task<List<BudgetAlert>> CheckBudgetAlertsAsync(Tenant tenant, Expense expense)
    {
        var alerts = new List<BudgetAlert>();
        var budgets = ParseCategoryBudgets(tenant.CategoryBudgets);

        if (!budgets.ContainsKey(expense.Category))
            return alerts;

        var budgetLimit = budgets[expense.Category];
        var expenses = await _expenseRepository.GetTenantExpensesAsync(tenant.Id);
        var categorySpending = expenses.Where(e => e.Category.Equals(expense.Category, StringComparison.OrdinalIgnoreCase) && e.Id != expense.Id).Sum(e => e.Amount);
        var totalSpent = categorySpending + expense.Amount;
        var usagePercentage = budgetLimit > 0 ? (int)((totalSpent / budgetLimit) * 100) : 0;

        if (usagePercentage >= 100)
        {
            alerts.Add(await CreateAlertAsync(expense.Id, tenant.Id, expense.Category, budgetLimit, totalSpent, usagePercentage, "at_limit"));
        }
        else if (usagePercentage >= 80)
        {
            alerts.Add(await CreateAlertAsync(expense.Id, tenant.Id, expense.Category, budgetLimit, totalSpent, usagePercentage, "near_limit"));
        }

        return alerts;
    }

    public async Task<ApiResult<BudgetPredictionResponse>> GetBudgetPredictionAsync(Tenant tenant)
    {
        var expenses = await _expenseRepository.GetTenantExpensesAsync(tenant.Id);
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var daysElapsed = now.Day;
        var daysRemaining = daysInMonth - daysElapsed;

        // Current month spending (all categories)
        var monthlyExpenses = expenses.Where(e => e.Date >= startOfMonth);
        var totalSpentThisMonth = monthlyExpenses.Sum(e => e.Amount);
        var dailyAverage = daysElapsed > 0 ? totalSpentThisMonth / daysElapsed : 0m;
        var projectedMonthTotal = dailyAverage * daysInMonth;

        // Historical baseline (last 6 months)
        var historicalMonths = GetLast6MonthsOfData(expenses);
        var avgMonthlySpend = historicalMonths.Count > 0 ? historicalMonths.Average(m => m.Value) : projectedMonthTotal;
        var variance = avgMonthlySpend > 0 ? Math.Abs(projectedMonthTotal - avgMonthlySpend) / avgMonthlySpend * 100m : 0m;

        var confidence = CalculateConfidenceScore(daysElapsed, dailyAverage, avgMonthlySpend);
        var healthStatus = projectedMonthTotal switch
        {
            var p when p <= avgMonthlySpend * 1.1m => "Healthy",
            var p when p <= avgMonthlySpend * 1.3m => "Warning",
            _ => "Critical"
        };
        var categoryPredictions = BuildCategoryPredictions(tenant, expenses, now, daysElapsed, daysInMonth, daysRemaining, confidence);

        return ApiResult<BudgetPredictionResponse>.Ok(new BudgetPredictionResponse(
            PredictedMonthTotal: Math.Round(projectedMonthTotal, 2),
            ConfidencePercentage: Math.Round(confidence * 100, 1), // convert to percentage
            HealthStatus: healthStatus,
            VariancePercentage: Math.Round(variance, 1),
            DaysRemaining: daysRemaining,
            CategoryPredictions: categoryPredictions
        ));
    }

    private CategoryPrediction[] BuildCategoryPredictions(
        Tenant tenant,
        IEnumerable<Expense> expenses,
        DateTime now,
        int daysElapsed,
        int daysInMonth,
        int daysRemaining,
        decimal confidence)
    {
        var budgets = ParseCategoryBudgets(tenant.CategoryBudgets);
        if (budgets.Count == 0)
        {
            return Array.Empty<CategoryPrediction>();
        }

        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var monthlyExpenses = expenses.Where(expense => expense.Date >= startOfMonth).ToList();

        return budgets
            .Select(item =>
            {
                var spent = monthlyExpenses
                    .Where(expense => expense.Category.Equals(item.Key, StringComparison.OrdinalIgnoreCase))
                    .Sum(expense => expense.Amount);
                var dailyAverage = daysElapsed > 0 ? spent / daysElapsed : 0m;
                var projected = dailyAverage * daysInMonth;
                var usage = item.Value > 0 ? (int)Math.Round(projected / item.Value * 100m) : 0;

                return new CategoryPrediction(
                    item.Key,
                    item.Value,
                    Math.Round(spent, 2),
                    Math.Round(projected, 2),
                    usage,
                    usage >= 100,
                    Math.Round(confidence * 100, 1),
                    daysRemaining);
            })
            .OrderByDescending(prediction => prediction.WillExceedBudget)
            .ThenByDescending(prediction => prediction.PredictedUsagePercentage)
            .ToArray();
    }

    private static decimal CalculateConfidenceScore(int daysElapsed, decimal dailyAvg, decimal historicalAvg)
    {
        if (daysElapsed < 7) return 0.3m;
        if (daysElapsed < 14) return 0.6m;
        if (daysElapsed < 21) return 0.8m;
        return 0.95m;
    }

    private static List<(DateTime Month, decimal Value)> GetLast6MonthsOfData(IEnumerable<Expense> expenses)
    {
        var now = DateTime.UtcNow;
        return Enumerable.Range(0, 6)
            .Select(offset => new DateTime(now.Year, now.Month, 1).AddMonths(-offset))
            .Select(month =>
            {
                var start = new DateTime(month.Year, month.Month, 1);
                var end = start.AddMonths(1).AddDays(-1);
                var monthData = expenses.Where(e => e.Date >= start && e.Date <= end);
                return (start, monthData.Sum(e => e.Amount));
            })
            .OrderBy(m => m.Item1)
            .ToList();
    }

    private Dictionary<string, decimal> ParseCategoryBudgets(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, decimal>();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, decimal>>(json) ?? new Dictionary<string, decimal>();
        }
        catch
        {
            return new Dictionary<string, decimal>();
        }
    }

    private async Task<BudgetAlert> CreateAlertAsync(Guid expenseId, Guid tenantId, string category, decimal limit, decimal spent, int usagePercentage, string alertType)
    {
        var alert = new BudgetAlert(
            TenantId: tenantId,
            Category: category,
            Limit: limit,
            Spent: spent,
            UsagePercentage: usagePercentage,
            AlertType: alertType,
            CreatedAt: DateTime.UtcNow
        );

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            ExpenseId = expenseId,
            Action = $"BudgetAlert_{alertType}",
            PerformedBy = "BudgetGuardrailBot",
            NewValue = JsonSerializer.Serialize(alert),
            Timestamp = DateTime.UtcNow
        };

        await _auditLogRepository.AddAsync(auditLog);
        await _auditLogRepository.SaveChangesAsync();

        return alert;
    }
}
