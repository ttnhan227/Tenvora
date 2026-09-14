using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record ProjectSummaryDto(
    Guid Id,
    Guid ClientId,
    string ClientName,
    string Name,
    string? Description,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal? BudgetAmount,
    string Currency,
    decimal TotalBilled,
    decimal TotalReceived,
    decimal TotalExpenses,
    decimal OutstandingAmount,
    int InvoiceCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateProjectRequest(
    [Required] Guid ClientId,
    [Required, MaxLength(200)] string Name,
    [MaxLength(2000)] string? Description,
    string? Status,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal? BudgetAmount,
    [StringLength(3, MinimumLength = 3)] string? Currency
);

public record UpdateProjectRequest(
    [MaxLength(200)] string? Name,
    [MaxLength(2000)] string? Description,
    string? Status,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal? BudgetAmount
);
