using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Subscription;
using VeriSpend.Api.Services;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Route("api/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionsController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [AllowAnonymous]
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var result = await _subscriptionService.GetAvailablePlansAsync();
        return Ok(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(SubscribeRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _subscriptionService.SubscribeAsync(tenantId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Owner,Manager")]
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentSubscription()
    {
        var tenantId = User.GetTenantId();
        var result = await _subscriptionService.GetCurrentSubscriptionAsync(tenantId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize(Roles = "Owner,Manager")]
    [HttpGet("billing-history")]
    public async Task<IActionResult> GetBillingHistory()
    {
        var tenantId = User.GetTenantId();
        var result = await _subscriptionService.GetBillingHistoryAsync(tenantId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("cancel")]
    public async Task<IActionResult> CancelSubscription()
    {
        var tenantId = User.GetTenantId();
        var result = await _subscriptionService.CancelSubscriptionAsync(tenantId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("upgrade")]
    public async Task<IActionResult> UpgradeSubscription(UpgradeSubscriptionRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _subscriptionService.UpgradeSubscriptionAsync(tenantId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
