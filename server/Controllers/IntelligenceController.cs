using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/intelligence")]
[Tags("Financial Intelligence & Ecosystem")]
public class IntelligenceController : ControllerBase
{
    private readonly IIntelligenceService _intelligenceService;

    public IntelligenceController(IIntelligenceService intelligenceService)
    {
        _intelligenceService = intelligenceService;
    }

    [HttpGet("feed")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResult<IntelligenceFeedResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeed([FromQuery] string? category, [FromQuery] string? search, [FromQuery] int limit = 30)
    {
        var feed = await _intelligenceService.GetFeedAsync(category, search, limit);
        return Ok(ApiResult<IntelligenceFeedResponse>.Ok(feed));
    }

    [HttpGet("articles/{id}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResult<ExternalArticleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResult<ExternalArticleDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetArticleById(string id)
    {
        var article = await _intelligenceService.GetArticleByIdAsync(id);
        if (article == null)
        {
            return NotFound(ApiResult<ExternalArticleDto>.Fail("Article not found."));
        }
        return Ok(ApiResult<ExternalArticleDto>.Ok(article));
    }

    [HttpGet("market-rates")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResult<List<MarketExchangeRateDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMarketRates()
    {
        var rates = await _intelligenceService.GetMarketRatesAsync();
        return Ok(ApiResult<List<MarketExchangeRateDto>>.Ok(rates));
    }

    [HttpGet("sources")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResult<List<ContentSourceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSources()
    {
        var sources = await _intelligenceService.GetSourcesAsync();
        return Ok(ApiResult<List<ContentSourceDto>>.Ok(sources));
    }

    public record ToggleSourceRequest(bool IsEnabled);

    [HttpPost("sources/{id}/toggle")]
    [Authorize(Policy = "OpsOrAdmin")]
    [ProducesResponseType(typeof(ApiResult<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ToggleSource(string id, [FromBody] ToggleSourceRequest req)
    {
        var success = await _intelligenceService.ToggleSourceAsync(id, req.IsEnabled);
        if (!success)
        {
            return NotFound(ApiResult<bool>.Fail("Source not found in registry."));
        }
        return Ok(ApiResult<bool>.Ok(req.IsEnabled));
    }

    [HttpPost("sync")]
    [Authorize(Policy = "OpsOrAdmin")]
    [ProducesResponseType(typeof(ApiResult<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TriggerSync(CancellationToken cancellationToken)
    {
        var success = await _intelligenceService.SyncFeedsAsync(cancellationToken);
        return Ok(ApiResult<string>.Ok("Financial intelligence feeds synchronized successfully."));
    }
}
