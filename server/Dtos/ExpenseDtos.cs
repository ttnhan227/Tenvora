using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record ExpenseDto(
    Guid Id,
    Guid AccountId,
    Guid TransactionId,
    Guid? ClientId,
    string? ClientName,
    Guid? ProjectId,
    string? ProjectName,
    string Merchant,
    string Category,
    string? Description,
    string? Reference,
    decimal Amount,
    string Currency,
    DateTime ExpenseDate,
    string Status,
    DateTime CreatedAt,
    DateTime? VoidedAt
);

public record CreateExpenseRequest(
    [Required] Guid AccountId,
    Guid? ClientId,
    Guid? ProjectId,
    [Required, MaxLength(200)] string Merchant,
    [Required, MaxLength(50)] string Category,
    [MaxLength(1000)] string? Description,
    [MaxLength(200)] string? Reference,
    [Range(typeof(decimal), "0.0001", "99999999999999")] decimal Amount,
    [Required, StringLength(3, MinimumLength = 3)] string Currency,
    DateTime ExpenseDate
);

public record ExpenseSummaryDto(
    string Currency,
    decimal Total,
    int Count,
    IReadOnlyList<ExpenseCategoryTotalDto> ByCategory
);

public record ExpenseCategoryTotalDto(string Category, decimal Amount, int Count);
public record VoidExpenseRequest([MaxLength(500)] string? Reason);
