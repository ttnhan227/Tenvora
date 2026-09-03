namespace Tenvora.Api.Dtos;

public class ExternalArticleDto
{
    public string Id { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string SourceCategory { get; set; } = string.Empty; // "Regulatory", "Research", "Payments", "Infrastructure"
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string CanonicalUrl { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public DateTime RetrievedAt { get; set; }
    public string? Author { get; set; }
    public string? ImageUrl { get; set; }
    public string Language { get; set; } = "en";
    public string ContentHash { get; set; } = string.Empty;
    public string? OperationalImpactTag { get; set; }
    public string? TenvoraAnalysis { get; set; }
}

public class MarketExchangeRateDto
{
    public string BaseCurrency { get; set; } = "EUR";
    public string TargetCurrency { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Source { get; set; } = "European Central Bank Reference Rates";
    public string Status { get; set; } = "Reference (Information Only)";
}

public class ContentSourceDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ProviderType { get; set; } = string.Empty; // "Rss", "GNewsApi", "EcbXml"
    public string EndpointUrl { get; set; } = string.Empty;
    public string Category { get; set; } = "Regulatory";
    public string AuthorityTier { get; set; } = "Tier-1";
    public bool IsEnabled { get; set; } = true;
    public DateTime? LastSuccessfulFetch { get; set; }
    public string? LastStatus { get; set; }
    public int ArticlesCount { get; set; }
}

public class IntelligenceFeedResponse
{
    public int TotalCount { get; set; }
    public DateTime LastUpdated { get; set; }
    public DateTime NextScheduledSync { get; set; }
    public List<string> ActiveSources { get; set; } = [];
    public List<string> AvailableCategories { get; set; } = [];
    public List<ExternalArticleDto> Articles { get; set; } = [];
    public List<ContentSourceDto> RegisteredSources { get; set; } = [];
}
