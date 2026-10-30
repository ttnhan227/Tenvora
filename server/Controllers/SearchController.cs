using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public sealed class SearchController(IBusinessService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] int limit = 6,
        CancellationToken ct = default)
    {
        var tenantId = User.GetTenantId();
        var result = await service.OmniSearchAsync(tenantId, q, limit, ct);
        return result.ToActionResult();
    }
}
