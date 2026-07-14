namespace VeriSpend.Api.Dtos.Subscription;

public sealed record SubscriptionPlanDto(
    string Id,
    string Name,
    string Description,
    decimal MonthlyPrice,
    decimal AnnualPrice,
    int ExpenseLimit,
    int UserSeats,
    bool AdvancedAnomalyDetection,
    bool UnlimitedReceiptScanning,
    bool PrioritySupport,
    bool CustomAuditReports,
    bool ApiAccess,
    bool CustomAiModels,
    bool Sso,
    bool DedicatedAccountManager,
    bool CustomIntegrations,
    bool OnPremiseOption,
    bool SlaGuarantee,
    string[] Features
);

public sealed record SubscribeRequest(string PlanId, string BillingCycle);

public sealed record SubscriptionResponse(
    Guid Id,
    Guid TenantId,
    string PlanId,
    string PlanName,
    decimal MonthlyPrice,
    decimal AnnualPrice,
    string BillingCycle,
    DateTime StartDate,
    DateTime? RenewalDate,
    bool IsActive,
    bool Cancelled,
    DateTime? CancelledAt,
    string Status
);

public sealed record CurrentSubscriptionResponse(
    string PlanId,
    string PlanName,
    decimal Price,
    string BillingCycle,
    DateTime StartDate,
    DateTime? RenewalDate,
    bool IsActive,
    int DaysUntilRenewal,
    string Status
);

public sealed record BillingHistoryItemResponse(
    Guid Id,
    DateTime Date,
    string Description,
    decimal Amount,
    string Status,
    string PlanName,
    string BillingCycle
);

public sealed record GetPlansResponse(SubscriptionPlanDto[] Plans);

public sealed record CancelSubscriptionResponse(bool Success, string Message);

public sealed record UpgradeSubscriptionRequest(string NewPlanId);
