namespace VeriSpend.Api.Models;

public class Expense
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public decimal BaseAmount { get; set; }
    public string Currency { get; set; } = default!;
    public string Merchant { get; set; } = default!;
    public string Category { get; set; } = default!;
    public string? Description { get; set; }
    public string Status { get; set; } = default!;
    public DateTime Date { get; set; }
    public bool IsDeleted { get; set; }
    public bool Flagged { get; set; }
    public string? FlagReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
