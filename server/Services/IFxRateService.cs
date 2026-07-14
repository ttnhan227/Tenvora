namespace VeriSpend.Api.Services;

public interface IFxRateService
{
    /// <summary>
    /// Gets the current exchange rate from the source currency to the target currency.
    /// Example: GetRateAsync("EUR", "USD") returns how many USD one EUR is worth.
    /// </summary>
    Task<decimal> GetRateAsync(string sourceCurrency, string targetCurrency);

    /// <summary>
    /// Converts an amount from the source currency to the target currency.
    /// </summary>
    Task<decimal> ConvertAsync(decimal amount, string sourceCurrency, string targetCurrency);
}
