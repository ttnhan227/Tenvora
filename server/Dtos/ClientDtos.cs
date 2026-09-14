using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record ClientSummaryDto(
    Guid Id, string Name, string ContactEmail, string? Phone, string? Company, string? Address,
    string Currency, int DefaultPaymentTermsDays, decimal? HourlyRate, string Status, string? Notes,
    decimal TotalInvoiced, decimal TotalPaid, decimal OutstandingBalance, int OpenInvoicesCount,
    int ProjectsCount, DateTime CreatedAt
);

public record CreateClientRequest(
    [Required, MaxLength(200)] string Name,
    [Required, EmailAddress, MaxLength(200)] string ContactEmail,
    [MaxLength(50)] string? Phone,
    [MaxLength(200)] string? Company,
    [MaxLength(300)] string? Address,
    [StringLength(3, MinimumLength = 3)] string? Currency,
    [Range(0, 365)] int? DefaultPaymentTermsDays,
    [Range(typeof(decimal), "0", "99999999999999")] decimal? HourlyRate,
    [MaxLength(1000)] string? Notes
);

public record UpdateClientRequest(
    [MaxLength(200)] string? Name,
    [EmailAddress, MaxLength(200)] string? ContactEmail,
    [MaxLength(50)] string? Phone,
    [MaxLength(200)] string? Company,
    [MaxLength(300)] string? Address,
    [StringLength(3, MinimumLength = 3)] string? Currency,
    [Range(0, 365)] int? DefaultPaymentTermsDays,
    [Range(typeof(decimal), "0", "99999999999999")] decimal? HourlyRate,
    string? Status,
    [MaxLength(1000)] string? Notes
);
