namespace Tenvora.Api.Dtos.Admin;

public record TenantSummaryResponse(
    Guid TenantId,
    string CompanyName,
    int TotalUsers,
    int TotalAccounts,
    int TotalTransactions,
    DateTime CreatedAt
);
