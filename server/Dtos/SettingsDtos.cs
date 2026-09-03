namespace Tenvora.Api.Dtos.Settings;

public record TenantSettingsDto(
    string CompanyName,
    string BaseCurrency,
    int SettlementCutoffHourUtc,
    bool AutoReconciliationEnabled
);
