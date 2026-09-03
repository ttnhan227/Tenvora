using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class PaymentRequest
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    [MaxLength(100)]
    public string IdempotencyKey { get; set; } = default!;
    
    public Guid SourceAccountId { get; set; }
    public Guid DestinationAccountId { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal Amount { get; set; }
    
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    [MaxLength(500)]
    public string? Purpose { get; set; }
    
    [MaxLength(50)]
    public string Status { get; set; } = "Initiated"; // Initiated, PendingAuthorization, Processing, Posted, Rejected, Failed, Reversed
    
    [MaxLength(500)]
    public string? RejectionReason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Account? SourceAccount { get; set; }
    public Account? DestinationAccount { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
