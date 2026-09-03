using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class Transaction
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? PaymentRequestId { get; set; }
    
    [MaxLength(100)]
    public string ReferenceNumber { get; set; } = default!;
    
    [MaxLength(50)]
    public string TransactionType { get; set; } = "Transfer"; // Transfer, Settlement, Fee, Adjustment, Reversal
    
    [MaxLength(50)]
    public string Status { get; set; } = "Initiated"; // Initiated, PendingAuthorization, Processing, Posted, Failed, Rejected, Settled, Reversed
    
    public Guid? OriginalTransactionId { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal Amount { get; set; }
    
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PostedAt { get; set; }
    public DateTime? SettledAt { get; set; }

    public PaymentRequest? PaymentRequest { get; set; }
    public Transaction? OriginalTransaction { get; set; }
    public ICollection<Transaction> ReversalTransactions { get; set; } = new List<Transaction>();
    public ICollection<LedgerEntry> LedgerEntries { get; set; } = new List<LedgerEntry>();
}
