namespace VeriSpend.Api.Models;

public class ExpenseReviewFeedback
{
    public Guid Id { get; set; }
    public Guid ExpenseId { get; set; }
    public Expense? Expense { get; set; }
    public Guid TenantId { get; set; }
    public string SubmittedBy { get; set; } = default!;
    public int OriginalRiskScore { get; set; }
    public string OriginalRiskLevel { get; set; } = default!;
    public string CorrectedRiskLevel { get; set; } = default!;
    public bool WasFalsePositive { get; set; }
    public bool WasAutoApproved { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
