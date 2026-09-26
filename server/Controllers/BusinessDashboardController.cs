using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/business-dashboard"), Authorize]
public sealed class BusinessDashboardController(IBusinessService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get() =>
        (await service.GetDashboardAsync(User.GetTenantId())).ToActionResult();
}
