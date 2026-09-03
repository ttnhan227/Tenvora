namespace Tenvora.Api.Models;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; } = default!; // Created, Updated, Deleted, StatusChanged, Reconciled, Reversed
    public string EntityType { get; set; } = default!; // Transaction, Account, Customer, PaymentRequest, SettlementBatch, ReconciliationRun
    public string EntityId { get; set; } = default!;
    public string PerformedBy { get; set; } = default!;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? OldValue { get; set; } // JSON
    public string? NewValue { get; set; } // JSON
    public string? Notes { get; set; }
    public string? IpAddress { get; set; }
}
