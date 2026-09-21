using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

public record AiQueryRequest(string Prompt);

[ApiController]
[Authorize]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;

    public AiController(IAiService aiService)
    {
        _aiService = aiService;
    }

    public AiController(AppDbContext dbContext)
        : this(new AiService(dbContext))
    {
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var status = _aiService.GetStatus();
        return Ok(ApiResult<object>.Ok(status));
    }

    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] AiQueryRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _aiService.ProcessQueryAsync(tenantId, request.Prompt);
        return Ok(ApiResult<object>.Ok(new
        {
            response = result.Response,
            source = result.Source,
            provider = result.Provider,
            model = result.Model,
            context = result.Context
        }));
    }
}
