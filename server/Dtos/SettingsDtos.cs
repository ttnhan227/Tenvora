namespace VeriSpend.Api.Dtos.Settings;

public sealed record CompanySettingsResponse(Guid TenantId, string CompanyName, string PlanType, decimal MaxSpendLimit, string? PolicyNotes);
public sealed record UpdatePolicyRequest(decimal MaxSpendLimit, string? PolicyNotes);
public sealed record UpdateCategoryBudgetsRequest(Dictionary<string, decimal> Budgets);

public sealed record AutoApprovalRulesResponse(
    bool Enabled,
    decimal MaxAmount,
    int MaxRiskScore,
    bool ExcludeWeekends,
    string[] ExcludedCategories,
    int MinAgeHours
);
public sealed record UpdateAutoApprovalRulesRequest(
    bool Enabled,
    decimal MaxAmount,
    int MaxRiskScore,
    bool ExcludeWeekends,
    string[] ExcludedCategories,
    int MinAgeHours
);
public sealed record PolicySimulationRequest(bool Enabled, decimal MaxAmount, int MaxRiskScore, bool ExcludeWeekends, string[] ExcludedCategories);
public sealed record PolicySimulationExpense(Guid ExpenseId, string Merchant, decimal Amount, string Category, int RiskScore, string Outcome, string Reason);
public sealed record PolicySimulationResponse(int EvaluatedCount, int AutoApproveCount, int HumanReviewCount, int EscalateCount, decimal AutomationRate, decimal ReviewHoursSaved, PolicySimulationExpense[] Expenses);

public sealed record NotificationSettingsResponse(
     bool EmailNotificationsEnabled,
     bool SlackNotificationsEnabled,
     string? SlackChannel,
     string? SlackTeamId,
     string? ManagerEmail,
     string? NoReplyEmail
 );
public sealed record UpdateNotificationSettingsRequest(
     bool EmailNotificationsEnabled,
     bool SlackNotificationsEnabled,
     string? SlackWebhookUrl,
     string? SlackChannel,
     string? SlackTeamId,
     string? SlackUserEmailMappings,
     string? ManagerEmail,
     string? NoReplyEmail
 );
