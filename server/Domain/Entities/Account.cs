using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class Account
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? CustomerId { get; set; }
    
    [MaxLength(50)]
    public string AccountNumber { get; set; } = default!;
    
    [MaxLength(30)]
    public string AccountType { get; set; } = "Asset"; // Asset, Liability, Clearing, Settlement
    
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal CachedBalance { get; set; } = 0m;
    
    [MaxLength(30)]
    public string Status { get; set; } = "Active"; // Active, Frozen, Closed
    
    public uint RowVersion { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Customer? Customer { get; set; }
    public ICollection<LedgerEntry> LedgerEntries { get; set; } = new List<LedgerEntry>();
}
