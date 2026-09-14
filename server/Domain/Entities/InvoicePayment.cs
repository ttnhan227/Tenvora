using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class InvoicePayment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid TransactionId { get; set; }
    public decimal Amount { get; set; }

    [Required, StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "USD";

    [Required, MaxLength(100)]
    public string IdempotencyKey { get; set; } = default!;

    [Required, MaxLength(128)]
    public string RequestHash { get; set; } = default!;

    [MaxLength(200)]
    public string? Reference { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Invoice? Invoice { get; set; }
    public Transaction? Transaction { get; set; }
}

public static class InvoiceStatuses
{
    public const string Draft = "Draft";
    public const string Sent = "Sent";
    public const string Viewed = "Viewed";
    public const string PartiallyPaid = "PartiallyPaid";
    public const string Paid = "Paid";
    public const string Overdue = "Overdue";
    public const string Cancelled = "Cancelled";

    public static bool CanReceivePayment(string status) =>
        status is Sent or Viewed or PartiallyPaid or Overdue;
}
