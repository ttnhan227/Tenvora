using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class IdempotencyRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    [MaxLength(100)]
    public string Key { get; set; } = default!;
    
    [MaxLength(128)]
    public string RequestHash { get; set; } = default!;
    
    [MaxLength(30)]
    public string Status { get; set; } = "Processing"; // Processing, Completed, Failed
    
    public int? StatusCode { get; set; }
    public string? ResponseBody { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);
}
