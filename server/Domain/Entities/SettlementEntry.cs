namespace Tenvora.Api.Domain.Entities;

public class SettlementEntry
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SettlementBatchId { get; set; }
    public Guid TransactionId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SettlementBatch? SettlementBatch { get; set; }
    public Transaction? Transaction { get; set; }
}
