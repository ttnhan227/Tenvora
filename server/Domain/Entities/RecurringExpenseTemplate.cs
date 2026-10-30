using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class RecurringExpenseTemplate
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    [MaxLength(50)] public string Category { get; set; } = default!;
    [Column(TypeName = "numeric(18,4)")] public decimal Amount { get; set; }
    [MaxLength(3)] public string Currency { get; set; } = "USD";
    [MaxLength(1000)] public string? Description { get; set; }
    [MaxLength(20)] public string Frequency { get; set; } = "monthly"; // daily, weekly, monthly, quarterly, yearly
    public DateTime NextDueDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastGeneratedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
