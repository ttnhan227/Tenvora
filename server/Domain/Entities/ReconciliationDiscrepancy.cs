using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public class ReconciliationDiscrepancy
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ReconciliationRunId { get; set; }
    public Guid AccountId { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal ExpectedBalance { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal CalculatedBalance { get; set; }
    
    [Column(TypeName = "numeric(18,4)")]
    public decimal DiscrepancyAmount { get; set; }
    
    [MaxLength(500)]
    public string Reason { get; set; } = default!;
    
    public bool Resolved { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ReconciliationRun? ReconciliationRun { get; set; }
    public Account? Account { get; set; }
}
