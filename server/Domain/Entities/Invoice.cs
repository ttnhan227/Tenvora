using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class Invoice
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ClientId { get; set; }

    [MaxLength(100)]
    public string InvoiceNumber { get; set; } = default!;

    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(14);

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [Column(TypeName = "numeric(18,4)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal TaxRate { get; set; } = 0m;

    [Column(TypeName = "numeric(18,4)")]
    public decimal TaxAmount { get; set; } = 0m;

    [Column(TypeName = "numeric(18,4)")]
    public decimal TotalAmount { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal AmountPaid { get; set; } = 0m;

    [MaxLength(50)]
    public string Status { get; set; } = "Draft"; // Draft, Sent, Viewed, Paid, Overdue, Cancelled

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? PaymentTerms { get; set; } // Net 14, Due on Receipt

    public Guid DestinationAccountId { get; set; }

    public Guid? PaymentTransactionId { get; set; }

    public DateTime? PaidAt { get; set; }
    public DateTime? ViewedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Client? Client { get; set; }
    public Account? DestinationAccount { get; set; }
    public Transaction? PaymentTransaction { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}

public class InvoiceItem
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }

    [MaxLength(300)]
    public string Description { get; set; } = default!;

    [Column(TypeName = "numeric(18,4)")]
    public decimal Quantity { get; set; } = 1m;

    [Column(TypeName = "numeric(18,4)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal Amount { get; set; }

    public Invoice? Invoice { get; set; }
}
