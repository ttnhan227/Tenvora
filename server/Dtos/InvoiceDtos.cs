namespace Tenvora.Api.Dtos;

public record InvoiceItemDto(
    Guid Id,
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal Amount
);

public record InvoiceItemRequest(
    string Description,
    decimal Quantity,
    decimal UnitPrice
);

public record InvoicePaymentDto(
    Guid Id,
    Guid TransactionId,
    decimal Amount,
    string Currency,
    string? Reference,
    DateTime PaidAt
);

public record InvoiceSummaryDto(
    Guid Id,
    string InvoiceNumber,
    Guid ClientId,
    string ClientName,
    string ClientEmail,
    Guid? ProjectId,
    string? ProjectName,
    DateTime IssueDate,
    DateTime DueDate,
    string Currency,
    decimal Subtotal,
    decimal TaxRate,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal AmountPaid,
    string Status,
    string? PaymentTerms,
    string? Notes,
    Guid DestinationAccountId,
    Guid? PaymentTransactionId,
    DateTime? PaidAt,
    DateTime? ViewedAt,
    DateTime CreatedAt,
    List<InvoiceItemDto> Items,
    List<InvoicePaymentDto> Payments
);

public record CreateInvoiceRequest(
    Guid ClientId,
    string? InvoiceNumber,
    DateTime? IssueDate,
    DateTime? DueDate,
    string? Currency,
    decimal? TaxRate,
    string? PaymentTerms,
    string? Notes,
    Guid? DestinationAccountId,
    List<InvoiceItemRequest> Items,
    Guid? ProjectId = null
);

public record PayInvoiceRequest(
    decimal? Amount,
    bool AutoTaxSetAside = true,
    string? Reference = null
);

public record CancelInvoiceRequest(string? Reason);

public record InvoiceStatsDto(
    string Currency,
    decimal TotalInvoicedAmount,
    decimal TotalPaidAmount,
    decimal TotalOutstandingAmount,
    int TotalInvoicesCount,
    int OpenInvoicesCount,
    int PaidInvoicesCount,
    int OverdueInvoicesCount
);

public record ClientReconciliationResponse(
    int InvoicesChecked,
    int MatchedCount,
    decimal TotalMatchedAmount,
    int UnmatchedInvoiceCount,
    List<InvoiceSummaryDto> MatchedInvoices,
    List<InvoiceSummaryDto> UnmatchedInvoices
);

