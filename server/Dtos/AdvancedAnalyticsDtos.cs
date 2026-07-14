namespace VeriSpend.Api.Dtos.Analytics;

// ── Department Budget Pooling ──────────────────────────────────────────────────
public sealed record DepartmentSpendSummary(
    string Department,
    decimal BudgetAllocated,
    decimal TotalSpend,
    decimal RemainingBudget,
    decimal UtilizationPercent,
    int ExpenseCount,
    DepartmentEmployeeSummary[] Employees
);

public sealed record DepartmentEmployeeSummary(
    string Email,
    decimal TotalSpend,
    int ExpenseCount,
    decimal SharePercent
);

public sealed record DepartmentBudgetPoolResponse(
    decimal TotalBudget,
    decimal TotalSpend,
    decimal TotalRemaining,
    decimal OverallUtilizationPercent,
    DepartmentSpendSummary[] Departments,
    string[] OverBudgetDepartments
);

// ── Seasonal Adjustment Factors ────────────────────────────────────────────────
public sealed record MonthlySeasonalFactor(
    string Month,        // e.g. "Jan"
    int MonthNumber,
    decimal AverageSpend,
    decimal SeasonalIndex,   // 1.0 = average, >1 = above average
    string SeasonalLabel     // "Peak", "Normal", "Low"
);

public sealed record SeasonalAdjustmentResponse(
    decimal AnnualAvgMonthlySpend,
    MonthlySeasonalFactor[] MonthlyFactors,
    string CurrentSeasonalLabel,
    decimal CurrentMonthIndex,
    decimal CurrentMonthBudgetSuggestion,
    string Insight
);

// ── Custom KPI Dashboard ───────────────────────────────────────────────────────
public sealed record KpiMetric(
    string Name,
    string Value,
    string? Unit,
    string? Trend,      // "up", "down", "stable"
    decimal? TrendValue,
    string Category     // "spend", "risk", "compliance", "efficiency"
);

public sealed record CustomKpiDashboardResponse(
    KpiMetric[] SpendKpis,
    KpiMetric[] RiskKpis,
    KpiMetric[] ComplianceKpis,
    KpiMetric[] EfficiencyKpis,
    DateTime GeneratedAt
);
