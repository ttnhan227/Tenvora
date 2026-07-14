namespace VeriSpend.Api.Services;

public sealed class FxRateService : IFxRateService
{
    // Mock exchange rates relative to USD for demonstration.
    // In a real application, this would call an API like Fixer.io or OpenExchangeRates.
    private readonly Dictionary<string, decimal> _ratesToUsd = new(StringComparer.OrdinalIgnoreCase)
    {
        { "USD", 1m },
        { "EUR", 1.08m },
        { "GBP", 1.25m },
        { "JPY", 0.0065m },
        { "CAD", 0.73m },
        { "AUD", 0.65m },
        { "CHF", 1.10m },
        { "CNY", 0.14m },
        { "INR", 0.012m }
    };

    public Task<decimal> GetRateAsync(string sourceCurrency, string targetCurrency)
    {
        if (sourceCurrency.Equals(targetCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(1m);
        }

        var sourceToUsd = _ratesToUsd.GetValueOrDefault(sourceCurrency, 1m);
        var targetToUsd = _ratesToUsd.GetValueOrDefault(targetCurrency, 1m);

        // Convert source to USD, then USD to target
        var rate = sourceToUsd / targetToUsd;
        
        return Task.FromResult(rate);
    }

    public async Task<decimal> ConvertAsync(decimal amount, string sourceCurrency, string targetCurrency)
    {
        var rate = await GetRateAsync(sourceCurrency, targetCurrency);
        return amount * rate;
    }
}
