using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Admin;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Authorize(Roles = "Owner")]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTenantUsers()
    {
        var tenantId = User.GetTenantId();
        var result = await _adminUserService.GetTenantUsersAsync(tenantId);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> InviteTenantUser(InviteTenantUserRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _adminUserService.InviteTenantUserAsync(tenantId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid id, UpdateUserRoleRequest request)
    {
        var tenantId = User.GetTenantId();
        var actorUserId = User.GetUserId();
        var result = await _adminUserService.UpdateUserRoleAsync(tenantId, id, actorUserId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateUserStatus(Guid id, UpdateUserStatusRequest request)
    {
        var tenantId = User.GetTenantId();
        var actorUserId = User.GetUserId();
        var result = await _adminUserService.UpdateUserStatusAsync(tenantId, id, actorUserId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
