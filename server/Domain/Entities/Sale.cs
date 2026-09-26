using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class Sale
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }

    [MaxLength(50)]
    public string SaleNumber { get; set; } = default!;

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [Column(TypeName = "numeric(18,4)")]
    public decimal TotalAmount { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = SaleStatuses.Posted;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string IdempotencyKey { get; set; } = default!;

    [MaxLength(128)]
    public string RequestHash { get; set; } = default!;

    public DateTime SoldAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Customer? Customer { get; set; }
    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public static class SaleStatuses
{
    public const string Posted = "Posted";
    public const string Voided = "Voided";
}

public sealed class SaleItem
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SaleId { get; set; }
    public Guid ProductId { get; set; }

    [MaxLength(200)]
    public string ProductName { get; set; } = default!;

    [MaxLength(40)]
    public string Unit { get; set; } = default!;

    [Column(TypeName = "numeric(18,4)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal LineTotal { get; set; }

    public Sale? Sale { get; set; }
    public Product? Product { get; set; }
}

