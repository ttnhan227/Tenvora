using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/telemetry")]
[Authorize]
public sealed class TelemetryController(AppDbContext db) : ControllerBase
{
    [HttpPost("events")]
    public async Task<IActionResult> RecordEvent([FromBody] RecordTelemetryEventRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        var telemetryEvent = new AiTelemetryEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            EventType = string.IsNullOrWhiteSpace(request.EventType) ? "DraftConfirmed" : request.EventType.Trim(),
            Intent = string.IsNullOrWhiteSpace(request.Intent) ? "general" : request.Intent.Trim(),
            DurationMs = Math.Max(0, request.DurationMs),
            FieldsCorrectedCount = Math.Max(0, request.FieldsCorrectedCount),
            AcceptedWithoutEdits = request.AcceptedWithoutEdits,
            IsError = request.IsError,
            ErrorMessage = request.ErrorMessage != null && request.ErrorMessage.Length > 500
                ? request.ErrorMessage[..500]
                : request.ErrorMessage,
            CreatedAt = DateTime.UtcNow
        };

        db.AiTelemetryEvents.Add(telemetryEvent);
        await db.SaveChangesAsync(ct);

        return ApiResult<bool>.Ok(true).ToActionResult();
    }

    [HttpGet("summary")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        var totalEvents = await db.AiTelemetryEvents
            .Where(e => e.TenantId == tenantId)
            .CountAsync(ct);

        var totalConfirmed = await db.AiTelemetryEvents
            .Where(e => e.TenantId == tenantId && !e.IsError)
            .CountAsync(ct);

        var confirmedWithoutEdits = await db.AiTelemetryEvents
            .Where(e => e.TenantId == tenantId && !e.IsError && e.AcceptedWithoutEdits)
            .CountAsync(ct);

        var acceptanceRate = totalConfirmed > 0
            ? Math.Round((double)confirmedWithoutEdits / totalConfirmed * 100, 1)
            : 0;

        var avgDuration = totalConfirmed > 0
            ? Math.Round(await db.AiTelemetryEvents
                .Where(e => e.TenantId == tenantId && !e.IsError)
                .AverageAsync(e => (double)e.DurationMs, ct), 0)
            : 0;

        var avgCorrections = totalConfirmed > 0
            ? Math.Round(await db.AiTelemetryEvents
                .Where(e => e.TenantId == tenantId && !e.IsError)
                .AverageAsync(e => (double)e.FieldsCorrectedCount, ct), 2)
            : 0;

        var totalErrors = await db.AiTelemetryEvents
            .Where(e => e.TenantId == tenantId && e.IsError)
            .CountAsync(ct);

        var errorRate = totalEvents > 0
            ? Math.Round((double)totalErrors / totalEvents * 100, 1)
            : 0;

        var recentEvents = await db.AiTelemetryEvents
            .Where(e => e.TenantId == tenantId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(20)
            .Select(e => new TelemetryEventItemDto
            {
                Id = e.Id,
                EventType = e.EventType,
                Intent = e.Intent,
                DurationMs = e.DurationMs,
                FieldsCorrectedCount = e.FieldsCorrectedCount,
                AcceptedWithoutEdits = e.AcceptedWithoutEdits,
                IsError = e.IsError,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync(ct);

        var summary = new TelemetrySummaryDto
        {
            TotalDraftsRecorded = totalEvents,
            TotalConfirmed = totalConfirmed,
            ConfirmedWithoutEdits = confirmedWithoutEdits,
            AcceptanceRate = acceptanceRate,
            AverageRecordingTimeMs = avgDuration,
            AverageFieldsCorrected = avgCorrections,
            TotalErrors = totalErrors,
            ErrorRate = errorRate,
            RecentEvents = recentEvents
        };

        return ApiResult<TelemetrySummaryDto>.Ok(summary).ToActionResult();
    }
}
