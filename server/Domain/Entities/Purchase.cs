using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class Purchase
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SupplierId { get; set; }
    [MaxLength(50)] public string PurchaseNumber { get; set; } = default!;
    [MaxLength(3)] public string Currency { get; set; } = "USD";
    [Column(TypeName = "numeric(18,4)")] public decimal TotalAmount { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Posted";
    [MaxLength(1000)] public string? Notes { get; set; }
    public string? InvoiceImageDataUrl { get; set; }
    [MaxLength(100)] public string IdempotencyKey { get; set; } = default!;
    [MaxLength(128)] public string RequestHash { get; set; } = default!;
    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Supplier? Supplier { get; set; }
    public ICollection<PurchaseItem> Items { get; set; } = new List<PurchaseItem>();
    public ICollection<PurchasePayment> Payments { get; set; } = new List<PurchasePayment>();
}

public sealed class PurchaseItem
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid PurchaseId { get; set; }
    public Guid? ProductId { get; set; }
    [MaxLength(200)] public string Description { get; set; } = default!;
    [MaxLength(40)] public string Unit { get; set; } = default!;
    [Column(TypeName = "numeric(18,4)")] public decimal Quantity { get; set; }
    [Column(TypeName = "numeric(18,4)")] public decimal UnitCost { get; set; }
    [Column(TypeName = "numeric(18,4)")] public decimal LineTotal { get; set; }
    public Purchase? Purchase { get; set; }
    public Product? Product { get; set; }
}

public sealed class PurchasePayment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid PurchaseId { get; set; }
    public Guid SupplierId { get; set; }
    [Column(TypeName = "numeric(18,4)")] public decimal Amount { get; set; }
    [MaxLength(3)] public string Currency { get; set; } = "USD";
    [MaxLength(50)] public string Method { get; set; } = "Other";
    [MaxLength(200)] public string? Reference { get; set; }
    [MaxLength(1000)] public string? Notes { get; set; }
    [MaxLength(100)] public string IdempotencyKey { get; set; } = default!;
    [MaxLength(128)] public string RequestHash { get; set; } = default!;
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsReversed { get; set; } = false;
    public DateTime? ReversedAt { get; set; }
    public Guid? ReversedByUserId { get; set; }
    [MaxLength(500)] public string? ReversalReason { get; set; }
    public Purchase? Purchase { get; set; }
    public Supplier? Supplier { get; set; }
}
