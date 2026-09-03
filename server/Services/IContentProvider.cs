using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services.ContentProviders;

public interface IContentProvider
{
    string ProviderType { get; }
    Task<IEnumerable<ExternalArticleDto>> FetchArticlesAsync(ContentSourceDto source, CancellationToken cancellationToken = default);
}
