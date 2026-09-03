using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;

namespace Tenvora.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ai")]
public class AiController : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(ApiResult<object>.Ok(new
        {
            Service = "Tenvora Operations Copilot",
            Status = "Operational",
            Capabilities = new[] { "TransactionInvestigation", "ReconciliationAnalysis", "NaturalLanguageFiltering" }
        }));
    }
}
