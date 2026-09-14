namespace Tenvora.Api.Dtos;

public record FinancialOverviewDto(
    string Currency,
    decimal CurrentBalance,
    decimal IncomeThisMonth,
    decimal ExpensesThisMonth,
    decimal NetCashFlowThisMonth,
    decimal OutstandingInvoices,
    int OutstandingInvoiceCount,
    int OverdueInvoiceCount,
    IReadOnlyList<CashFlowPointDto> CashFlow,
    IReadOnlyList<OverviewInvoiceDto> OutstandingItems,
    IReadOnlyList<OverviewTransactionDto> RecentTransactions
);

public record CashFlowPointDto(string Month, decimal Income, decimal Expenses);
public record OverviewInvoiceDto(Guid Id, string InvoiceNumber, string ClientName, DateTime DueDate, decimal OutstandingAmount, string Currency, string Status);
public record OverviewTransactionDto(Guid Id, string Description, string Type, string Status, decimal Amount, string Currency, DateTime Date, string? Category);

public record FinancialReportDto(
    string Currency,
    DateTime From,
    DateTime To,
    decimal Income,
    decimal Expenses,
    decimal Net,
    decimal OutstandingInvoices,
    IReadOnlyList<NamedAmountDto> IncomeByClient,
    IReadOnlyList<NamedAmountDto> ExpensesByCategory,
    IReadOnlyList<CashFlowPointDto> CashFlow
);

public record NamedAmountDto(string Name, decimal Amount);
