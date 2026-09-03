using System.Text.Json.Serialization;

namespace Tenvora.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = "OperationsManager"; // TenantAdmin, OperationsManager, ComplianceOfficer, ApiClient
    public bool IsActive { get; set; } = true;
    public string PreferredCurrency { get; set; } = "USD";

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string? InviteToken { get; set; }

    public DateTime? InviteTokenExpiresAt { get; set; }

    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
