using System.Text.Json.Serialization;

namespace VeriSpend.Api.Models;

public class RefreshToken
{
    public Guid Id { get; set; }

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string Token { get; set; } = default!;

    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool Revoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
