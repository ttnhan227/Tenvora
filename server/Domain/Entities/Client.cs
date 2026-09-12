using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class Client
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = default!;

    [MaxLength(200)]
    public string ContactEmail { get; set; } = default!;

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? Company { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    public int DefaultPaymentTermsDays { get; set; } = 14; // e.g. Net 14

    [Column(TypeName = "numeric(18,4)")]
    public decimal? HourlyRate { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Active"; // Active, Archived, Lead

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
