using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class Product
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = default!;

    [MaxLength(100)]
    public string? Sku { get; set; }

    [MaxLength(40)]
    public string Unit { get; set; } = "item";

    [Column(TypeName = "numeric(18,4)")]
    public decimal DefaultPrice { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal CostPrice { get; set; } = 0m;

    [Column(TypeName = "numeric(18,4)")]
    public decimal StockQuantity { get; set; } = 0m;

    [Column(TypeName = "numeric(18,4)")]
    public decimal? MinStockLevel { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    public bool IsActive { get; set; } = true;
    public bool TrackInventory { get; set; } = false;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    public ICollection<PurchaseItem> PurchaseItems { get; set; } = new List<PurchaseItem>();
    public ICollection<StockAdjustment> StockAdjustments { get; set; } = new List<StockAdjustment>();
}
