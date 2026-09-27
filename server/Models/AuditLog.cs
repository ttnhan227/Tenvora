namespace Tenvora.Api.Models;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; } = default!; // Created, Updated, Deleted
    public string EntityType { get; set; } = default!; // Customer, Sale, Payment, Supplier, Purchase, BusinessExpense
    public string EntityId { get; set; } = default!;
    public string PerformedBy { get; set; } = default!;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? OldValue { get; set; } // JSON
    public string? NewValue { get; set; } // JSON
    public string? Notes { get; set; }
    public string? IpAddress { get; set; }
    public string Origin { get; set; } = "Manual";
    public Guid? AiActionId { get; set; }
    public bool? ConfirmationRequired { get; set; }
    public bool? ConfirmationGiven { get; set; }
}
