using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class StockAdjustment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? UserId { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal QuantityBefore { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal AdjustmentQuantity { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal QuantityAfter { get; set; }

    [MaxLength(50)]
    public string Reason { get; set; } = "physical_count";

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime AdjustedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
}
