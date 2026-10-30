using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public sealed record CaptureLineItemDto(
    string Description,
    string Unit,
    decimal Quantity,
    decimal UnitCost,
    decimal LineTotal,
    Guid? MatchedProductId = null,
    string? MatchedProductName = null,
    decimal Confidence = 0.9m,
    string Source = "ocr",
    string? Why = null
);

public sealed record CaptureProvenanceFieldDto(
    object? Value,
    decimal Confidence,
    string Source,
    string Why
);

public sealed record CaptureProvenanceDto(
    decimal OverallConfidence,
    string SourceType,
    Dictionary<string, CaptureProvenanceFieldDto> Fields,
    Dictionary<string, string> Explanations
);

public sealed record DuplicateWarningDto(
    bool IsDuplicate,
    string? DuplicateReason = null,
    string? RecordType = null,
    Guid? RecordId = null,
    string? RecordNumber = null,
    DateTime? RecordDate = null,
    decimal? RecordAmount = null
);

public sealed record CaptureDraftDto(
    string Intent,
    string? Vendor,
    Guid? SupplierId,
    string? Category,
    DateTime? Date,
    DateTime? DueDate,
    string Currency,
    decimal TotalAmount,
    decimal TaxAmount,
    decimal PaidAmount,
    string PaymentMethod,
    string? Notes,
    string? InvoiceImageUrl,
    string? FileHash,
    List<CaptureLineItemDto> LineItems,
    CaptureProvenanceDto Provenance,
    List<string> ValidationErrors,
    List<string> ValidationWarnings
);

public sealed record CaptureResultDto(
    Guid ActionId,
    string Intent,
    string Status,
    CaptureDraftDto Draft,
    DuplicateWarningDto Duplicate,
    string Summary
);

public sealed record AnalyzeDocumentRequest(
    string? DataUrl = null,
    string? FileUrl = null,
    string? RawText = null,
    string? DocumentTypeHint = null
);

public sealed record TenantExtractionRuleDto(
    Guid Id,
    string RuleType,
    string RawPattern,
    string NormalizedPattern,
    Guid? TargetEntityId,
    string TargetName,
    DateTime CreatedAt
);

public sealed record CreateExtractionRuleRequest(
    [Required, MaxLength(50)] string RuleType,
    [Required, MaxLength(200)] string RawPattern,
    Guid? TargetEntityId = null,
    [Required, MaxLength(200)] string TargetName = ""
);

public sealed record BulkApproveCaptureRequest(
    [Required, MinLength(1)] List<Guid> ActionIds
);

public sealed record BulkApproveResultDto(
    int TotalProcessed,
    int ApprovedCount,
    int FailedCount,
    List<string> Messages
);
