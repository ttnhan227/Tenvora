using System.Text.Json.Serialization;

namespace VeriSpend.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = default!;
    public bool IsActive { get; set; } = true;
    public bool ExpenseCardSuspended { get; set; }
    public DateTime? ExpenseCardSuspendedAt { get; set; }
    public string? ExpenseCardSuspensionReason { get; set; }
    public string PreferredCurrency { get; set; } = "USD";

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string? InviteToken { get; set; }

    public DateTime? InviteTokenExpiresAt { get; set; }

    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
