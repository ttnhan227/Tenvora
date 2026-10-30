namespace Tenvora.Api.Dtos;

public sealed class RecordTelemetryEventRequest
{
    public string EventType { get; set; } = "DraftConfirmed";
    public string Intent { get; set; } = "general";
    public long DurationMs { get; set; }
    public int FieldsCorrectedCount { get; set; }
    public bool AcceptedWithoutEdits { get; set; }
    public bool IsError { get; set; }
    public string? ErrorMessage { get; set; }
}

public sealed class TelemetrySummaryDto
{
    public int TotalDraftsRecorded { get; set; }
    public int TotalConfirmed { get; set; }
    public int ConfirmedWithoutEdits { get; set; }
    public double AcceptanceRate { get; set; } // % confirmed without edits
    public double AverageRecordingTimeMs { get; set; }
    public double AverageFieldsCorrected { get; set; }
    public int TotalErrors { get; set; }
    public double ErrorRate { get; set; }
    public List<TelemetryEventItemDto> RecentEvents { get; set; } = new();
}

public sealed class TelemetryEventItemDto
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
    public long DurationMs { get; set; }
    public int FieldsCorrectedCount { get; set; }
    public bool AcceptedWithoutEdits { get; set; }
    public bool IsError { get; set; }
    public DateTime CreatedAt { get; set; }
}
