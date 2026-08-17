using VeriSpend.Api.Services;
using Xunit;

namespace VeriSpend.Api.Tests;

public sealed class FxRateServiceTests
{
    private readonly FxRateService _sut = new();

    [Fact]
    public async Task GetRateAsync_WhenCurrenciesAreEqual_ReturnsOne()
    {
        var rate = await _sut.GetRateAsync("USD", "USD");
        Assert.Equal(1m, rate);

        var eurRate = await _sut.GetRateAsync("EUR", "eur");
        Assert.Equal(1m, eurRate);
    }

    [Fact]
    public async Task ConvertAsync_WhenConvertingFromEurToUsd_MultipliesCorrectly()
    {
        // 100 EUR to USD (EUR is 1.08 USD)
        var converted = await _sut.ConvertAsync(100m, "EUR", "USD");
        Assert.Equal(108m, converted);
    }

    [Fact]
    public async Task ConvertAsync_WhenConvertingFromUsdToEur_DividesCorrectly()
    {
        // 108 USD to EUR
        var converted = await _sut.ConvertAsync(108m, "USD", "EUR");
        Assert.Equal(100m, converted);
    }

    [Fact]
    public async Task ConvertAsync_WhenCurrencyIsUnknown_DefaultsToOneToOne()
    {
        var converted = await _sut.ConvertAsync(50m, "XYZ", "USD");
        Assert.Equal(50m, converted);
    }
}
