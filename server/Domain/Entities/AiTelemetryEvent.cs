using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class AiTelemetryEvent
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string EventType { get; set; } = "DraftConfirmed";

    [MaxLength(50)]
    public string Intent { get; set; } = default!;

    public long DurationMs { get; set; }

    public int FieldsCorrectedCount { get; set; }

    public bool AcceptedWithoutEdits { get; set; }

    public bool IsError { get; set; }

    [MaxLength(500)]
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
