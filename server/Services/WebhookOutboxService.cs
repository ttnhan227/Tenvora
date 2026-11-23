using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Services;

public interface IWebhookOutboxService
{
    Task<int> EnqueueAsync(
        Guid tenantId,
        string eventType,
        string sourceEventId,
        object data,
        CancellationToken cancellationToken = default);
}

public sealed class WebhookOutboxService(AppDbContext db) : IWebhookOutboxService
{
    private static readonly JsonSerializerOptions PayloadSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public Task<int> EnqueueAsync(
        Guid tenantId,
        string eventType,
        string sourceEventId,
        object data,
        CancellationToken cancellationToken = default) =>
        EnqueueAsync(db, tenantId, eventType, sourceEventId, data, cancellationToken);

    public static async Task<int> EnqueueAsync(
        AppDbContext db,
        Guid tenantId,
        string eventType,
        string sourceEventId,
        object data,
        CancellationToken cancellationToken = default)
    {
        if (!WebhookEventTypes.Supported.Contains(eventType))
            return 0;

        var activeEndpoints = await db.WebhookEndpoints
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId && e.IsActive)
            .ToListAsync(cancellationToken);

        if (activeEndpoints.Count == 0)
            return 0;

        var matching = activeEndpoints.Where(e => e.SubscribesTo(eventType)).ToList();
        if (matching.Count == 0)
            return 0;

        var utcNow = DateTime.UtcNow;
        var traceParent = Activity.Current?.Id;
        if (traceParent != null && traceParent.Length > 128)
            traceParent = traceParent[..128];

        var enqueued = 0;
        foreach (var endpoint in matching)
        {
            var deliveryId = BuildDeliveryId(endpoint.Id, eventType, sourceEventId);
            var payload = new
            {
                eventId = sourceEventId,
                deliveryId,
                eventType,
                tenantId,
                occurredAt = utcNow,
                data
            };

            var payloadJson = JsonSerializer.Serialize(payload, PayloadSerializerOptions);
            db.WebhookOutboxEvents.Add(new WebhookOutboxEvent
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EndpointId = endpoint.Id,
                EventType = eventType,
                DeliveryId = deliveryId,
                PayloadJson = payloadJson,
                TraceParent = traceParent,
                Status = WebhookOutboxStatuses.Pending,
                AttemptCount = 0,
                MaxAttempts = 5,
                NextAttemptAt = utcNow,
                CreatedAt = utcNow
            });
            enqueued++;
        }

        return enqueued;
    }

    public static string BuildDeliveryId(Guid endpointId, string eventType, string sourceEventId)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{endpointId:N}:{eventType}:{sourceEventId}"));
        return $"whd_{Convert.ToHexStringLower(hash)[..24]}";
    }
}
