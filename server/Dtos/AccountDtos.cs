using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record CreateAccountRequest(
    Guid? CustomerId,
    [Required, MaxLength(50)] string AccountNumber,
    [Required, MaxLength(30)] string AccountType, // Asset, Liability, Clearing, Settlement
    [Required, StringLength(3, MinimumLength = 3)] string Currency,
    decimal InitialBalance = 0m
);

public record AccountResponse(
    Guid Id,
    Guid TenantId,
    Guid? CustomerId,
    string? CustomerName,
    string AccountNumber,
    string AccountType,
    string Currency,
    decimal CachedBalance,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateCustomerRequest(
    [Required, MaxLength(200)] string Name,
    [Required, EmailAddress] string Email,
    [MaxLength(50)] string? Phone
);

public record CustomerResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string Email,
    string? Phone,
    string KycStatus,
    string Status,
    List<AccountResponse> Accounts,
    DateTime CreatedAt
);
