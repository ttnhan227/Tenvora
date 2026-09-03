using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class LedgerEntry
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid TransactionId { get; set; }
    public Guid AccountId { get; set; }
    
    [MaxLength(10)]
    public string EntryType { get; set; } = "Debit"; // Debit, Credit
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal DebitAmount { get; set; } = 0m;
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal CreditAmount { get; set; } = 0m;
    
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    public DateTime PostedAt { get; set; } = DateTime.UtcNow;
    
    [MaxLength(500)]
    public string? Description { get; set; }

    public Transaction? Transaction { get; set; }
    public Account? Account { get; set; }
}
