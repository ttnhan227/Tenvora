namespace VeriSpend.Api.Dtos.Compliance;

// ── SOX Audit Trail ────────────────────────────────────────────────────────────
public sealed record SoxAuditEntry(
    Guid Id,
    Guid? ExpenseId,
    string Action,
    string PerformedBy,
    string? IpAddress,
    DateTime Timestamp,
    string? OldValue,
    string? NewValue,
    string? Notes,
    string IntegrityHash     // SHA-256 of key fields for tamper detection
);

public sealed record SoxAuditTrailResponse(
    SoxAuditEntry[] Entries,
    int TotalCount,
    DateTime ExportedAt,
    string ExportHash        // Hash of entire export for chain-of-custody
);

// ── GDPR ───────────────────────────────────────────────────────────────────────
public sealed record GdprUserDataExport(
    Guid UserId,
    string Email,
    string Role,
    bool IsActive,
    string PreferredCurrency,
    DateTime? CardSuspendedAt,
    string? CardSuspensionReason,
    GdprExpenseRecord[] Expenses,
    GdprAuditRecord[] AuditActions,
    DateTime ExportedAt
);

public sealed record GdprExpenseRecord(
    Guid Id,
    decimal Amount,
    string Currency,
    string Merchant,
    string Category,
    string? Description,
    string Status,
    DateTime Date,
    bool Flagged,
    string? FlagReason
);

public sealed record GdprAuditRecord(
    Guid Id,
    string Action,
    DateTime Timestamp,
    string? Notes
);

public sealed record GdprDeletionResponse(
    Guid UserId,
    string Email,
    bool Success,
    string Message,
    int ExpensesAnonymized,
    int AuditLogsRetained,    // Regulatory logs are retained but anonymized
    DateTime ProcessedAt
);

// ── SOC2 Controls ──────────────────────────────────────────────────────────────
public sealed record Soc2ControlCheck(
    string ControlId,         // e.g. "CC6.1"
    string Description,
    bool Passing,
    string Status,            // "PASS", "FAIL", "WARN"
    string Evidence,
    string Category           // "Security", "Availability", "Processing Integrity", "Confidentiality", "Privacy"
);

public sealed record Soc2ComplianceReport(
    Soc2ControlCheck[] Controls,
    int PassingCount,
    int FailingCount,
    int WarningCount,
    decimal ComplianceScore,
    DateTime GeneratedAt,
    string OverallStatus      // "COMPLIANT", "PARTIAL", "NON_COMPLIANT"
);
