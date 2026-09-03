using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IIntelligenceService
{
    Task<IntelligenceFeedResponse> GetFeedAsync(string? category = null, string? search = null, int limit = 30);
    Task<ExternalArticleDto?> GetArticleByIdAsync(string id);
    Task<List<MarketExchangeRateDto>> GetMarketRatesAsync();
    Task<List<ContentSourceDto>> GetSourcesAsync();
    Task<bool> ToggleSourceAsync(string sourceId, bool isEnabled);
    Task<bool> SyncFeedsAsync(CancellationToken cancellationToken = default);
}
