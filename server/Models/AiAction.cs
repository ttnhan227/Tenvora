namespace Tenvora.Api.Models;

/// <summary>
/// A short-lived, server-owned proposal produced from natural language. The payload is
/// is server-owned. Confirmation may include a small allow-listed set of editable
/// form values, which the service validates and merges into this payload.
/// </summary>
public sealed class AiAction
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string Intent { get; set; } = default!;
    public string RiskLevel { get; set; } = "Financial";
    public string Status { get; set; } = "PendingConfirmation";
    public bool RequiresConfirmation { get; set; } = true;
    public string SourceText { get; set; } = default!;
    public string? UiContextJson { get; set; }
    public string PayloadJson { get; set; } = default!;
    public string? ResultJson { get; set; }
    public string IdempotencyKey { get; set; } = default!;
    public string? AffectedEntityType { get; set; }
    public Guid? AffectedEntityId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public static class AiActionStatuses
{
    public const string NeedsClarification = "NeedsClarification";
    public const string PendingConfirmation = "PendingConfirmation";
    public const string Executing = "Executing";
    public const string Executed = "Executed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";
    public const string Failed = "Failed";
}
