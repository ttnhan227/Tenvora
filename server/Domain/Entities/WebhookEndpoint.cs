using System.Text.Json.Serialization;

namespace Tenvora.Api.Domain.Entities;

public static class WebhookEventTypes
{
    public const string SaleRecorded = "sale.recorded";
    public const string PaymentReceived = "payment.received";
    public const string InventoryAdjusted = "inventory.adjusted";

    public static readonly IReadOnlySet<string> Supported = new HashSet<string>(StringComparer.Ordinal)
    {
        SaleRecorded,
        PaymentReceived,
        InventoryAdjusted
    };

    public static bool TryNormalize(IEnumerable<string>? eventTypes, out List<string> normalized, out string? error)
    {
        normalized = [];
        error = null;

        if (eventTypes == null)
        {
            error = "Subscribe to at least one supported webhook event type.";
            return false;
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var raw in eventTypes)
        {
            var value = raw?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(value))
                continue;

            if (!Supported.Contains(value))
            {
                error = $"Unsupported webhook event type '{raw}'. Allowed values: {string.Join(", ", Supported)}.";
                return false;
            }

            if (seen.Add(value))
                normalized.Add(value);
        }

        if (normalized.Count == 0)
        {
            error = "Subscribe to at least one supported webhook event type.";
            return false;
        }

        normalized.Sort(StringComparer.Ordinal);
        return true;
    }

    public static IReadOnlyList<string> ParseStored(string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
            return [];

        return stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}

public static class WebhookOutboxStatuses
{
    public const string Pending = "Pending";
    public const string Delivering = "Delivering";
    public const string Delivered = "Delivered";
    public const string DeadLettered = "DeadLettered";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Pending,
        Delivering,
        Delivered,
        DeadLettered
    };
}

public sealed class WebhookEndpoint
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Url { get; set; } = default!;
    [JsonIgnore] public string SigningSecret { get; set; } = default!;
    public string EventTypes { get; set; } = default!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WebhookOutboxEvent> OutboxEvents { get; set; } = new List<WebhookOutboxEvent>();

    public bool SubscribesTo(string eventType) =>
        WebhookEventTypes.ParseStored(EventTypes)
            .Any(e => string.Equals(e, eventType, StringComparison.Ordinal));
}
