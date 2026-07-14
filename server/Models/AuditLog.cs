namespace VeriSpend.Api.Models;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? ExpenseId { get; set; }
    public Expense? Expense { get; set; }
    public string Action { get; set; } = default!;
    public string PerformedBy { get; set; } = default!;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Notes { get; set; }
}
