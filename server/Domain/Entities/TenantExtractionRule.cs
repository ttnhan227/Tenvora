using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenvora.Api.Domain.Entities;

public sealed class TenantExtractionRule
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }

    [MaxLength(50)]
    public string RuleType { get; set; } = "vendor_alias"; // "vendor_alias" | "product_alias" | "category_alias"

    [MaxLength(200)]
    public string RawPattern { get; set; } = default!;

    [MaxLength(200)]
    public string NormalizedPattern { get; set; } = default!;

    public Guid? TargetEntityId { get; set; }

    [MaxLength(200)]
    public string TargetName { get; set; } = default!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
