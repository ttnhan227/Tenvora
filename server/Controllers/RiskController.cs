using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RiskController : ControllerBase
{
    private readonly AppDbContext _context;

    public RiskController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("evaluations")]
    public async Task<IActionResult> GetEvaluations([FromQuery] int limit = 100)
    {
        var tenantId = User.GetTenantId();

        var evaluations = await _context.RiskEvaluations
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(limit)
            .Select(r => new RiskEvaluationResponse(
                r.Id,
                r.PaymentRequestId,
                r.Score,
                r.RiskLevel,
                r.Decision,
                JsonSerializer.Deserialize<List<string>>(r.RuleHitsJson, (JsonSerializerOptions?)null) ?? new List<string>(),
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResult<List<RiskEvaluationResponse>>.Ok(evaluations));
    }
}
