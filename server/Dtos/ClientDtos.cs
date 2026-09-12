namespace Tenvora.Api.Dtos;

public record ClientSummaryDto(
    Guid Id,
    string Name,
    string ContactEmail,
    string? Phone,
    string? Company,
    string? Address,
    string Currency,
    int DefaultPaymentTermsDays,
    decimal? HourlyRate,
    string Status,
    string? Notes,
    decimal TotalInvoiced,
    decimal TotalPaid,
    decimal OutstandingBalance,
    int OpenInvoicesCount,
    DateTime CreatedAt
);

public record CreateClientRequest(
    string Name,
    string ContactEmail,
    string? Phone,
    string? Company,
    string? Address,
    string? Currency,
    int? DefaultPaymentTermsDays,
    decimal? HourlyRate,
    string? Notes
);

public record UpdateClientRequest(
    string? Name,
    string? ContactEmail,
    string? Phone,
    string? Company,
    string? Address,
    string? Currency,
    int? DefaultPaymentTermsDays,
    decimal? HourlyRate,
    string? Status,
    string? Notes
);
