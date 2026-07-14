namespace VeriSpend.Api.Dtos.Manager;

using VeriSpend.Api.Dtos.Expenses;

public sealed record PendingExpenseResponse(Guid Id, string EmployeeEmail, decimal Amount, string Currency, string Merchant, string Category, string Status, DateTime Date, bool Flagged, string? FlagReason, string? Description, string[] ReceiptUrls, int ReviewPriority, int TriggeredRuleCount, RiskAssessmentResponse RiskAssessment, ReviewAssistantResponse ReviewAssistant);
public sealed record RejectionReasonInsightResponse(string Reason, int Count);
public sealed record CategoryFlagInsightResponse(string Category, int FlaggedCount, int ExpenseCount, decimal FlagRate);
public sealed record EmployeeFlagInsightResponse(string EmployeeEmail, int FlaggedCount, int ExpenseCount, decimal FlagRate);
public sealed record PolicyTriggerInsightResponse(string Trigger, int Count);
public sealed record ReviewTurnaroundInsightResponse(decimal AverageApprovalHours, decimal AverageDecisionHours);
public sealed record OperationalKpiInsightResponse(decimal SlaBreachRate, decimal EscalationRate, int TotalDecisions, int SlaBreachedDecisions, int EscalationCount);
public sealed record MonthlyHighRiskInsightResponse(string MonthLabel, int HighRiskCount, int ReviewedCount);
public sealed record MonthlyPolicyTriggerInsightResponse(string MonthLabel, int TriggeredCount);
public sealed record PolicyRecommendationResponse(string Title, string Recommendation, decimal EstimatedSavings, string Benchmark);
public sealed record EmployeeBehaviorInsightResponse(string EmployeeEmail, string Insight, string Nudge, int SignalCount);
public sealed record AuditInsightsResponse(int ApprovedCount, int RejectedCount, int FlaggedCount, int HighRiskCount, ReviewTurnaroundInsightResponse Turnaround, OperationalKpiInsightResponse OperationalKpis, LearningMetricsResponse LearningMetrics, PolicyRecommendationResponse[] PolicyRecommendations, EmployeeBehaviorInsightResponse[] EmployeeBehaviorInsights, RejectionReasonInsightResponse[] TopRejectionReasons, CategoryFlagInsightResponse[] HighestFlaggedCategories, EmployeeFlagInsightResponse[] HighestFlagRateEmployees, PolicyTriggerInsightResponse[] TopPolicyTriggers, MonthlyHighRiskInsightResponse[] MonthlyHighRiskTrend, MonthlyPolicyTriggerInsightResponse[] MonthlyPolicyTriggerTrend);
public sealed record ApproveExpenseResponse(Guid ExpenseId, string Status, DateTime Timestamp);
public sealed record RejectExpenseRequest(string Reason);
public sealed record SubmitReviewFeedbackRequest(string CorrectedRiskLevel, bool WasFalsePositive, string? Notes);
public sealed record ReviewFeedbackResponse(Guid Id, Guid ExpenseId, string CorrectedRiskLevel, bool WasFalsePositive, bool WasAutoApproved, decimal ConfidenceScore, DateTime CreatedAt);
public sealed record LearningMetricsResponse(int FeedbackCount, int FalsePositiveCount, int AutoApprovalFalsePositiveCount, decimal FalsePositiveRate, decimal CurrentConfidenceScore, decimal ConfidenceTrendPercentage);
public sealed record AuditEntryResponse(Guid Id, string Action, string PerformedBy, DateTime Timestamp, string? Notes, string? OldValue, string? NewValue);
public sealed record BudgetPredictionResponse(decimal PredictedMonthTotal, decimal ConfidencePercentage, string HealthStatus, decimal VariancePercentage, int DaysRemaining, CategoryPrediction[] CategoryPredictions);
public sealed record MonthlySpendPoint(string Month, decimal Amount);
public sealed record ForecastResponse(MonthlySpendPoint[] HistoricalData, MonthlySpendPoint[] ProjectedData, decimal CurrentMonthProjection, decimal NextMonthProjection, decimal TrendPercentage);

// Predictive breach warning per-category breakdown
public sealed record CategoryPrediction(
    string Category,
    decimal Budget,
    decimal SpentToDate,
    decimal ProjectedMonthly,
    int PredictedUsagePercentage,
    bool WillExceedBudget,
    decimal ConfidenceScore,
    int DaysRemaining
);
