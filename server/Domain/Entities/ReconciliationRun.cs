using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class ReconciliationRun
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    [MaxLength(100)]
    public string RunNumber { get; set; } = default!;
    
    [MaxLength(30)]
    public string Status { get; set; } = "Completed"; // Completed, DiscrepanciesFound, Failed
    
    public int TotalAccountsChecked { get; set; }
    public int TotalLedgerEntriesChecked { get; set; }
    public int DiscrepancyCount { get; set; }
    
    [MaxLength(1000)]
    public string? Notes { get; set; }
    
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public ICollection<ReconciliationDiscrepancy> Discrepancies { get; set; } = new List<ReconciliationDiscrepancy>();
}
