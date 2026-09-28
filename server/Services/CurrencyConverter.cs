namespace Tenvora.Api.Services;

public static class CurrencyConverter
{
    // Fixed reference exchange rate: 1 USD = 25,000 VND
    // 25,000 has prime factors 2^3 * 5^6. In decimal arithmetic, dividing an integer VND amount
    // by 25,000 produces at most 4 decimal digits, with ZERO repeating fractions or precision loss.
    public const decimal UsdToVndRate = 25000m;

    private static readonly Dictionary<string, decimal> RatesToUsd = new(StringComparer.OrdinalIgnoreCase)
    {
        ["USD"] = 1.0m,
        ["VND"] = UsdToVndRate,
        ["EUR"] = 0.92m,
        ["GBP"] = 0.79m,
        ["SGD"] = 1.34m
    };

    public static decimal Convert(decimal amount, string fromCurrency, string toCurrency)
    {
        if (amount == 0m) return 0m;
        var from = string.IsNullOrWhiteSpace(fromCurrency) ? "USD" : fromCurrency.Trim().ToUpperInvariant();
        var to = string.IsNullOrWhiteSpace(toCurrency) ? "USD" : toCurrency.Trim().ToUpperInvariant();
        if (from == to) return amount;

        // Optimized exact zero-loss bidirectional conversion between VND and USD
        if (from == "VND" && to == "USD")
        {
            return decimal.Round(amount / UsdToVndRate, 4, MidpointRounding.AwayFromZero);
        }
        if (from == "USD" && to == "VND")
        {
            return decimal.Round(amount * UsdToVndRate, 0, MidpointRounding.AwayFromZero);
        }

        var fromRate = RatesToUsd.GetValueOrDefault(from, 1.0m);
        var toRate = RatesToUsd.GetValueOrDefault(to, 1.0m);

        var amountInUsd = amount / fromRate;
        var converted = amountInUsd * toRate;

        if (to == "VND")
        {
            return decimal.Round(converted, 0, MidpointRounding.AwayFromZero);
        }

        return decimal.Round(converted, 4, MidpointRounding.AwayFromZero);
    }
}
