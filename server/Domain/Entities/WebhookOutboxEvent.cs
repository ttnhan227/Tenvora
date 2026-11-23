namespace Tenvora.Api.Domain.Entities;

public sealed class WebhookOutboxEvent
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid EndpointId { get; set; }
    public string EventType { get; set; } = default!;
    public string DeliveryId { get; set; } = default!;
    public string PayloadJson { get; set; } = default!;
    public string? TraceParent { get; set; }
    public string Status { get; set; } = WebhookOutboxStatuses.Pending;
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 5;
    public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;
    public int? LastHttpStatusCode { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }
    public DateTime? DeadLetteredAt { get; set; }

    public WebhookEndpoint? Endpoint { get; set; }
}
