using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
[Route("api/business-dashboard")]
public sealed class DashboardController(IBusinessService service) : ControllerBase
{
    [HttpGet("attention")]
    public async Task<IActionResult> GetAttention() =>
        (await service.GetDashboardAttentionItemsAsync(User.GetTenantId())).ToActionResult();

    [HttpGet("insight")]
    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights() =>
        (await service.GetDashboardInsightsAsync(User.GetTenantId())).ToActionResult();
}
