namespace VeriSpend.Api.Dtos.Expenses;

public sealed record RelatedExpenseResponse(Guid Id, string EmployeeEmail, decimal Amount, string Currency, string Merchant, string Category, string Status, DateTime Date, string Relationship);
public sealed record ReviewAssistantResponse(string Recommendation, string Confidence, string Summary, string[] MissingEvidence, string[] ReviewerPrompts, string[] SuspiciousPatterns, RelatedExpenseResponse[] RelatedExpenses);
public sealed record RiskAssessmentResponse(int RiskScore, string RiskLevel, string[] RiskReasons, string[] PolicyTriggers);
public sealed record ExpenseCreateRequest(decimal Amount, string Currency, string Merchant, string Category, DateTime Date, string? Description);
public sealed record ExpenseUpdateRequest(decimal Amount, string Currency, string Merchant, string Category, DateTime Date, string? Description);
public sealed record ExpenseBulkUpdateRequest(Guid Id, decimal Amount, string Currency, string Merchant, string Category, DateTime Date, string? Description);
public sealed record ExpenseResponse(Guid Id, decimal Amount, string Currency, string Merchant, string Category, string Status, DateTime Date, DateTime CreatedAt, DateTime? UpdatedAt, bool Flagged, string? FlagReason, string? Description, string[] ReceiptUrls, RiskAssessmentResponse RiskAssessment, ReviewAssistantResponse ReviewAssistant, AnomalyFlagResponse[] Anomalies);
public sealed record ExpenseCategoryBreakdownResponse(string Category, decimal TotalSpent, int ExpenseCount);
public sealed record ExpenseInsightsResponse(decimal CurrentMonthTotal, decimal PreviousMonthTotal, decimal ChangeAmount, decimal ChangePercentage, ExpenseCategoryBreakdownResponse[] TopCategories);
public sealed record ExpenseStatsResponse(decimal TotalSpent, decimal AverageSpend, int ExpenseCount, int PendingCount, int DraftCount, int HighRiskCount, decimal AverageRiskScore, int AutoApprovedCount, ExpenseInsightsResponse Insights);
public sealed record AnomalyFlagResponse(string Type, string Reason);
