using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class BusinessExpense
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    [MaxLength(50)] public string Category { get; set; } = default!;
    [Column(TypeName = "numeric(18,4)")] public decimal Amount { get; set; }
    [MaxLength(3)] public string Currency { get; set; } = "USD";
    [MaxLength(1000)] public string? Description { get; set; }
    public string? ReceiptImageDataUrl { get; set; }
    [MaxLength(100)] public string IdempotencyKey { get; set; } = default!;
    [MaxLength(128)] public string RequestHash { get; set; } = default!;
    public DateTime ExpenseDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
