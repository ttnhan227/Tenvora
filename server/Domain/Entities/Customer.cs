using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class Customer
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    [MaxLength(200)]
    public string Name { get; set; } = default!;
    
    [MaxLength(200)]
    public string Email { get; set; } = default!;
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(30)]
    public string KycStatus { get; set; } = "Verified"; // Pending, Verified, Rejected
    
    [MaxLength(30)]
    public string Status { get; set; } = "Active"; // Active, Suspended, Closed
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
