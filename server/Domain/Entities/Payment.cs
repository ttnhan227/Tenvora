using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class Payment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SaleId { get; set; }
    public Guid CustomerId { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [MaxLength(50)]
    public string Method { get; set; } = "Other";

    [MaxLength(200)]
    public string? Reference { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string IdempotencyKey { get; set; } = default!;

    [MaxLength(128)]
    public string RequestHash { get; set; } = default!;

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsReversed { get; set; } = false;
    public DateTime? ReversedAt { get; set; }
    public Guid? ReversedByUserId { get; set; }
    [MaxLength(500)]
    public string? ReversalReason { get; set; }

    public Sale? Sale { get; set; }
    public Customer? Customer { get; set; }
}

