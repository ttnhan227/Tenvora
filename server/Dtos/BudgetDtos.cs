namespace VeriSpend.Api.Dtos.Budget;

public sealed record CategoryBudget(
    string Category,
    decimal Limit,
    decimal Spent,
    decimal Remaining,
    int UsagePercentage,
    bool IsNearLimit,
    bool IsAtLimit
);

public sealed record BudgetAlert(
    Guid TenantId,
    string Category,
    decimal Limit,
    decimal Spent,
    int UsagePercentage,
    string AlertType,
    DateTime CreatedAt
);
