using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record CreateTransferRequest(
    [Required] Guid SourceAccountId,
    [Required] Guid DestinationAccountId,
    [Required, Range(0.01, 1000000000)] decimal Amount,
    [Required, StringLength(3, MinimumLength = 3)] string Currency,
    [MaxLength(500)] string? Purpose
);

public record CreatePaymentResponse(
    Guid PaymentRequestId,
    Guid? TransactionId,
    string? ReferenceNumber,
    string Status,
    decimal Amount,
    string Currency,
    string? RejectionReason,
    DateTime CreatedAt
);

public record ReverseTransactionRequest(
    [MaxLength(500)] string? Reason
);

public record TransactionResponse(
    Guid Id,
    Guid TenantId,
    Guid? PaymentRequestId,
    string ReferenceNumber,
    string TransactionType,
    string Status,
    Guid? OriginalTransactionId,
    decimal Amount,
    string Currency,
    string? Description,
    DateTime CreatedAt,
    DateTime? PostedAt,
    DateTime? SettledAt,
    List<LedgerEntryResponse> LedgerEntries
);

public record LedgerEntryResponse(
    Guid Id,
    Guid? TransactionId,
    Guid AccountId,
    string? AccountNumber,
    string EntryType,
    decimal DebitAmount,
    decimal CreditAmount,
    string Currency,
    DateTime PostedAt,
    string? Description
);

public record AccountLedgerHistoryResponse(
    Guid AccountId,
    string AccountNumber,
    string AccountType,
    string Currency,
    decimal DerivedBalance,
    decimal CachedBalance,
    bool BalanceMatches,
    List<LedgerEntryResponse> Entries
);

public record SettlementBatchResponse(
    Guid Id,
    Guid TenantId,
    string BatchNumber,
    int TotalTransactions,
    decimal TotalDebitAmount,
    decimal TotalCreditAmount,
    string Currency,
    string Status,
    DateTime CreatedAt,
    DateTime? SettledAt
);

public record TriggerReconciliationRequest(
    string? Notes
);

public record ReconciliationResponse(
    Guid Id,
    Guid TenantId,
    string RunNumber,
    string Status,
    int TotalAccountsChecked,
    int TotalLedgerEntriesChecked,
    int DiscrepancyCount,
    string? Notes,
    DateTime StartedAt,
    DateTime? CompletedAt,
    List<ReconciliationDiscrepancyResponse> Discrepancies
);

public record ReconciliationDiscrepancyResponse(
    Guid Id,
    Guid AccountId,
    string? AccountNumber,
    decimal ExpectedBalance,
    decimal CalculatedBalance,
    decimal DiscrepancyAmount,
    string Reason,
    bool Resolved,
    DateTime CreatedAt
);

public record RiskEvaluationResponse(
    Guid Id,
    Guid PaymentRequestId,
    int Score,
    string RiskLevel,
    string Decision,
    List<string> RuleHits,
    DateTime CreatedAt
);

public record AdminCreateUserRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    [Required] string Role,
    string? PreferredCurrency = "USD"
);

public record AdminUserResponse(
    Guid Id,
    string Email,
    string Role,
    bool IsActive,
    string PreferredCurrency,
    DateTime CreatedAt
);
