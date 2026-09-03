using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "TenantAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var tenantId = User.GetTenantId();
        var result = await _adminUserService.GetUsersAsync(tenantId);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _adminUserService.CreateUserAsync(tenantId, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPatch("{userId:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid userId)
    {
        var tenantId = User.GetTenantId();
        var result = await _adminUserService.ToggleUserActiveAsync(tenantId, userId);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
