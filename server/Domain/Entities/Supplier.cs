using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public sealed class Supplier
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    [MaxLength(200)] public string Name { get; set; } = default!;
    [MaxLength(50)] public string? Phone { get; set; }
    [MaxLength(200)] public string? Email { get; set; }
    [MaxLength(300)] public string? Address { get; set; }
    [MaxLength(1000)] public string? Notes { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
    public ICollection<PurchasePayment> Payments { get; set; } = new List<PurchasePayment>();
}
