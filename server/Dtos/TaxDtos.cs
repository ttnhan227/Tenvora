namespace Tenvora.Api.Dtos;

public record TaxSummaryDto(
    string Currency,
    decimal AvailableSpendingBalance,
    decimal TaxVaultBalance,
    decimal DefaultTaxRatePercent,
    bool AutoTaxSetAsideEnabled,
    string FilingStatus,
    string? PersonalTaxIdLast4,
    decimal YtdGrossIncome,
    decimal YtdTaxSetAsideTotal,
    decimal EstimatedAnnualTaxLiability,
    decimal EstimatedCurrentQuarterLiability,
    string CurrentQuarter,
    DateTime NextQuarterDeadline,
    int DaysUntilQuarterDeadline,
    List<QuarterlyScheduleItemDto> QuarterlySchedule,
    List<TaxTransferRecordDto> RecentTaxSetAsides
);

public record QuarterlyScheduleItemDto(
    string Quarter,
    string PeriodRange,
    DateTime DueDate,
    decimal EstimatedAmount,
    string Status // Paid, Upcoming, Overdue
);

public record TaxTransferRecordDto(
    Guid TransactionId,
    string ReferenceNumber,
    decimal Amount,
    string Currency,
    string Description,
    DateTime Timestamp
);

public record UpdateTaxSettingsRequest(
    decimal? DefaultTaxRatePercent,
    bool? AutoTaxSetAsideEnabled,
    string? FilingStatus,
    string? PersonalTaxIdLast4,
    string? LinkedExternalBankName
);

public record ManualTaxTransferRequest(
    decimal Amount,
    string Direction, // "ToTaxVault" or "ToSpendingWallet"
    string? Notes
);
