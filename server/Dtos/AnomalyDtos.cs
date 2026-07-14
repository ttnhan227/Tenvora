namespace VeriSpend.Api.Dtos.Anomalies;

public sealed record AnomalyNotification(
    Guid ExpenseId,
    Guid TenantId,
    string EmployeeEmail,
    string Merchant,
    decimal Amount,
    DateTime Date,
    string Type,
    string Reason,
    DateTime CreatedAt
);