using System.Diagnostics;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed class WebhookOptions
{
    public const string HttpClientName = "TenvoraWebhooks";

    public bool EnableBackgroundWorker { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 5;
    public int BatchSize { get; set; } = 20;
    public bool ResolveDns { get; set; } = true;
}

public interface IWebhookDeliveryService
{
    Task<int> ProcessPendingBatchAsync(int batchSize = 20, CancellationToken cancellationToken = default);
    Task<ApiResult<WebhookDeliveryDto>> ReplayDeliveryAsync(Guid tenantId, Guid outboxEventId, CancellationToken cancellationToken = default);
}

public sealed class WebhookDeliveryService(
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    IWebhookUrlValidator urlValidator,
    ILogger<WebhookDeliveryService> logger,
    TimeProvider? timeProvider = null) : IWebhookDeliveryService
{
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    public static TimeSpan ComputeBackoff(int attemptCount)
    {
        var exponent = Math.Max(0, attemptCount - 1);
        var seconds = Math.Min(1800d, 30d * Math.Pow(2d, exponent));
        return TimeSpan.FromSeconds(seconds);
    }

    public async Task<int> ProcessPendingBatchAsync(int batchSize = 20, CancellationToken cancellationToken = default)
    {
        var effectiveBatchSize = Math.Clamp(batchSize, 1, 200);
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        var dueEvents = await db.WebhookOutboxEvents
            .Include(e => e.Endpoint)
            .Where(e => e.Status == WebhookOutboxStatuses.Pending && e.NextAttemptAt <= utcNow)
            .OrderBy(e => e.NextAttemptAt)
            .ThenBy(e => e.CreatedAt)
            .Take(effectiveBatchSize)
            .ToListAsync(cancellationToken);

        if (dueEvents.Count == 0)
            return 0;

        var httpClient = httpClientFactory.CreateClient(WebhookOptions.HttpClientName);
        var processed = 0;

        foreach (var outboxEvent in dueEvents)
        {
            await DeliverSingleAsync(httpClient, outboxEvent, cancellationToken);
            processed++;
        }

        return processed;
    }

    public async Task<ApiResult<WebhookDeliveryDto>> ReplayDeliveryAsync(
        Guid tenantId,
        Guid outboxEventId,
        CancellationToken cancellationToken = default)
    {
        var outboxEvent = await db.WebhookOutboxEvents
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == outboxEventId, cancellationToken);

        if (outboxEvent == null)
            return ApiResult<WebhookDeliveryDto>.Fail("Webhook delivery not found.");

        if (string.Equals(outboxEvent.Status, WebhookOutboxStatuses.Delivered, StringComparison.Ordinal))
            return ApiResult<WebhookDeliveryDto>.Fail("Delivered webhook events cannot be replayed.");

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        outboxEvent.Status = WebhookOutboxStatuses.Pending;
        outboxEvent.AttemptCount = 0;
        outboxEvent.NextAttemptAt = utcNow;
        outboxEvent.DeadLetteredAt = null;
        outboxEvent.LastError = null;

        await db.SaveChangesAsync(cancellationToken);

        return ApiResult<WebhookDeliveryDto>.Ok(MapDelivery(outboxEvent));
    }

    private async Task DeliverSingleAsync(
        HttpClient httpClient,
        WebhookOutboxEvent outboxEvent,
        CancellationToken cancellationToken)
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        outboxEvent.Status = WebhookOutboxStatuses.Delivering;
        outboxEvent.AttemptCount += 1;
        await db.SaveChangesAsync(cancellationToken);

        ActivityContext originContext = default;
        var hasOriginContext = !string.IsNullOrWhiteSpace(outboxEvent.TraceParent)
            && ActivityContext.TryParse(outboxEvent.TraceParent, null, out originContext);

        var links = hasOriginContext ? new[] { new ActivityLink(originContext) } : null;
        using var activity = TenvoraTelemetry.ActivitySource.StartActivity(
            "tenvora.webhook.deliver",
            ActivityKind.Client,
            parentContext: hasOriginContext ? originContext : default,
            links: links);

        activity?.SetTag("webhook.event_type", outboxEvent.EventType);
        activity?.SetTag("webhook.attempt", outboxEvent.AttemptCount);

        var endpoint = outboxEvent.Endpoint;
        if (endpoint == null || !endpoint.IsActive)
        {
            MarkDeadLettered(outboxEvent, utcNow, null, "Webhook endpoint is inactive or unavailable.");
            activity?.SetTag("webhook.status", outboxEvent.Status);
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        var urlCheck = await urlValidator.ValidateAsync(endpoint.Url, cancellationToken);
        if (!urlCheck.IsValid || urlCheck.Uri == null)
        {
            MarkDeadLettered(outboxEvent, utcNow, null, SanitizeError(urlCheck.Error ?? "Webhook URL failed safety validation."));
            activity?.SetTag("webhook.status", outboxEvent.Status);
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        var unixTimestamp = new DateTimeOffset(utcNow).ToUnixTimeSeconds();
        var signature = WebhookSignature.Compute(endpoint.SigningSecret, unixTimestamp, outboxEvent.PayloadJson);

        using var request = new HttpRequestMessage(HttpMethod.Post, urlCheck.Uri)
        {
            Content = new StringContent(outboxEvent.PayloadJson, Encoding.UTF8, "application/json")
        };

        request.Headers.TryAddWithoutValidation("X-Tenvora-Event", outboxEvent.EventType);
        request.Headers.TryAddWithoutValidation("X-Tenvora-Delivery-Id", outboxEvent.DeliveryId);
        request.Headers.TryAddWithoutValidation("X-Tenvora-Timestamp", unixTimestamp.ToString());
        request.Headers.TryAddWithoutValidation("X-Tenvora-Signature", signature);

        var traceParent = activity?.Id ?? outboxEvent.TraceParent;
        if (!string.IsNullOrWhiteSpace(traceParent))
        {
            request.Headers.TryAddWithoutValidation("traceparent", traceParent);
        }

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            var statusCode = (int)response.StatusCode;
            outboxEvent.LastHttpStatusCode = statusCode;
            activity?.SetTag("http.status_code", statusCode);

            if (statusCode is >= 200 and <= 299)
            {
                outboxEvent.Status = WebhookOutboxStatuses.Delivered;
                outboxEvent.DeliveredAt = _timeProvider.GetUtcNow().UtcDateTime;
                outboxEvent.DeadLetteredAt = null;
                outboxEvent.LastError = null;
            }
            else if (IsPermanentClientError(statusCode))
            {
                MarkDeadLettered(
                    outboxEvent,
                    _timeProvider.GetUtcNow().UtcDateTime,
                    statusCode,
                    $"Permanent HTTP {statusCode} response from webhook receiver.");
            }
            else
            {
                ScheduleRetryOrDeadLetter(
                    outboxEvent,
                    _timeProvider.GetUtcNow().UtcDateTime,
                    statusCode,
                    $"Transient HTTP {statusCode} response from webhook receiver.");
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            outboxEvent.Status = WebhookOutboxStatuses.Pending;
            outboxEvent.AttemptCount = Math.Max(0, outboxEvent.AttemptCount - 1);
            await db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        catch (Exception ex)
        {
            var errorMessage = ex is TaskCanceledException
                ? "Webhook delivery timed out."
                : $"Webhook delivery failed: {ex.GetType().Name}.";

            logger.LogWarning(ex, "Webhook delivery attempt {Attempt} failed for event {EventId}", outboxEvent.AttemptCount, outboxEvent.Id);
            ScheduleRetryOrDeadLetter(outboxEvent, _timeProvider.GetUtcNow().UtcDateTime, null, errorMessage);
        }

        activity?.SetTag("webhook.status", outboxEvent.Status);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static bool IsPermanentClientError(int statusCode) =>
        statusCode is >= 400 and <= 499 and not 408 and not 429;

    private static void ScheduleRetryOrDeadLetter(
        WebhookOutboxEvent outboxEvent,
        DateTime utcNow,
        int? statusCode,
        string error)
    {
        outboxEvent.LastHttpStatusCode = statusCode;
        outboxEvent.LastError = SanitizeError(error);

        if (outboxEvent.AttemptCount >= outboxEvent.MaxAttempts)
        {
            outboxEvent.Status = WebhookOutboxStatuses.DeadLettered;
            outboxEvent.DeadLetteredAt = utcNow;
        }
        else
        {
            outboxEvent.Status = WebhookOutboxStatuses.Pending;
            outboxEvent.NextAttemptAt = utcNow.Add(ComputeBackoff(outboxEvent.AttemptCount));
        }
    }

    private static void MarkDeadLettered(
        WebhookOutboxEvent outboxEvent,
        DateTime utcNow,
        int? statusCode,
        string error)
    {
        outboxEvent.Status = WebhookOutboxStatuses.DeadLettered;
        outboxEvent.DeadLetteredAt = utcNow;
        outboxEvent.LastHttpStatusCode = statusCode;
        outboxEvent.LastError = SanitizeError(error);
    }

    private static string SanitizeError(string error) =>
        error.Length <= 500 ? error : error[..500];

    public static WebhookDeliveryDto MapDelivery(WebhookOutboxEvent e) =>
        new(
            e.Id,
            e.EndpointId,
            e.EventType,
            e.DeliveryId,
            e.Status,
            e.AttemptCount,
            e.MaxAttempts,
            e.NextAttemptAt,
            e.LastHttpStatusCode,
            e.LastError,
            e.CreatedAt,
            e.DeliveredAt,
            e.DeadLetteredAt);
}
