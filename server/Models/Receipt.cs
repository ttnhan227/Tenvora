namespace VeriSpend.Api.Models;

public class Receipt
{
    public Guid Id { get; set; }
    public Guid ExpenseId { get; set; }
    public Expense? Expense { get; set; }
    public string FileUrl { get; set; } = default!;
    public string? OcrRawData { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
