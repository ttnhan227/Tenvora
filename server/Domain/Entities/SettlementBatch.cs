using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class SettlementBatch
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    [MaxLength(100)]
    public string BatchNumber { get; set; } = default!;
    
    public int TotalTransactions { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal TotalDebitAmount { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal TotalCreditAmount { get; set; }
    
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    [MaxLength(30)]
    public string Status { get; set; } = "Open"; // Open, Processing, Settled, Failed
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SettledAt { get; set; }

    public ICollection<SettlementEntry> Entries { get; set; } = new List<SettlementEntry>();
}
