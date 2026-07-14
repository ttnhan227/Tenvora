using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Settings;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet("company")]
    public async Task<IActionResult> GetCompanySettings()
    {
        var tenantId = User.GetTenantId();
        var result = await _settingsService.GetCompanySettingsAsync(tenantId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpPut("policy")]
    public async Task<IActionResult> UpdatePolicy(UpdatePolicyRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _settingsService.UpdatePolicyAsync(tenantId, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpGet("category-budgets")]
    public async Task<IActionResult> GetCategoryBudgets()
    {
        var tenantId = User.GetTenantId();
        var result = await _settingsService.GetCategoryBudgetsAsync(tenantId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpPut("category-budgets")]
    public async Task<IActionResult> UpdateCategoryBudgets(UpdateCategoryBudgetsRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _settingsService.UpdateCategoryBudgetsAsync(tenantId, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

     [HttpGet("auto-approval-rules")]
     public async Task<IActionResult> GetAutoApprovalRules()
     {
         var tenantId = User.GetTenantId();
         var result = await _settingsService.GetAutoApprovalRulesAsync(tenantId);
         return Ok(result);
     }

     [Authorize(Roles = "Owner")]
     [HttpPut("auto-approval-rules")]
     public async Task<IActionResult> UpdateAutoApprovalRules(UpdateAutoApprovalRulesRequest request)
     {
         var tenantId = User.GetTenantId();
         var result = await _settingsService.UpdateAutoApprovalRulesAsync(tenantId, request);
         return result.Success ? Ok(result) : NotFound(result);
     }

     [HttpGet("notifications")]
     public async Task<IActionResult> GetNotificationSettings()
     {
         var tenantId = User.GetTenantId();
         var result = await _settingsService.GetNotificationSettingsAsync(tenantId);
         return Ok(result);
     }

     [Authorize(Roles = "Owner")]
     [HttpPut("notifications")]
     public async Task<IActionResult> UpdateNotificationSettings(UpdateNotificationSettingsRequest request)
     {
         var tenantId = User.GetTenantId();
         var result = await _settingsService.UpdateNotificationSettingsAsync(tenantId, request);
         return result.Success ? Ok(result) : NotFound(result);
     }
 }
