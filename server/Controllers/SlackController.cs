using Microsoft.AspNetCore.Mvc;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Slack;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;
using VeriSpend.Api.Services;
using System.Text.Json;

namespace VeriSpend.Api.Controllers;

[ApiController]
[Route("api/slack")]
public class SlackController : ControllerBase
{
    private readonly ISlackService _slackService;
    private readonly IManagerService _managerService;
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;

    public SlackController(
        ISlackService slackService,
        IManagerService managerService,
        IUserRepository userRepository,
        ITenantRepository tenantRepository)
    {
        _slackService = slackService;
        _managerService = managerService;
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
    }

    [HttpPost("slash")]
    public async Task<IActionResult> HandleSlashCommand([FromForm] SlackSlashCommandRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TeamId) || string.IsNullOrWhiteSpace(request.UserId))
        {
            return BadRequest(new { error = "Missing required Slack parameters" });
        }

        // Find tenant by Slack teamId
        var tenant = await _tenantRepository.GetBySlackTeamIdAsync(request.TeamId);

        if (tenant == null || string.IsNullOrWhiteSpace(tenant.SlackVerificationToken))
        {
            return Ok(new { response_type = "ephemeral", text = "⚠️ This Slack workspace is not connected to VeriSpend. Contact your Owner to enable Slack integration." });
        }

        // Verify the command is /expense
        if (!string.Equals(request.Command, "/expense", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new { response_type = "ephemeral", text = "Unknown command. Use `/expense approve <expense-id>`" });
        }

        var parts = (request.Text ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0 || !parts[0].Equals("approve", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new { response_type = "ephemeral", text = "Usage: `/expense approve <expense-id>`" });
        }

        if (parts.Length < 2 || !Guid.TryParse(parts[1], out var expenseId))
        {
            return Ok(new { response_type = "ephemeral", text = "Invalid expense ID. Usage: `/expense approve <valid-guid>`" });
        }

        // Map Slack userId to a VeriSpend email via the tenant's SlackUserEmailMappings JSON.
        var email = await GetEmailFromSlackUserAsync(tenant, request.UserId);
        if (email == null)
        {
            return Ok(new
            {
                response_type = "ephemeral",
                text = $"❌ Your Slack user ID ({request.UserId}) is not mapped to a VeriSpend account. Ask your Owner to add the mapping in Settings → Notifications."
            });
        }

        // Find the VeriSpend user in this tenant.
        var approver = await _userRepository.GetByEmailAndTenantAsync(email, tenant.Id);
        if (approver == null)
        {
            return Ok(new { response_type = "ephemeral", text = $"❌ No VeriSpend user found with email {email} in this workspace." });
        }

        // Role check
        if (!approver.Role.Equals("Manager", StringComparison.OrdinalIgnoreCase) &&
            !approver.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new { response_type = "ephemeral", text = "❌ Only Managers and Owners can approve expenses via Slack." });
        }

        // Try approval
        var result = await _managerService.ApproveAsync(expenseId, tenant.Id, approver.Email);

        if (!result.Success)
        {
            var errorMsg = result.Error ?? "Unknown error";
            return Ok(new { response_type = "ephemeral", text = $"❌ Approval failed: {errorMsg}" });
        }

        // Post confirmation to channel if configured
        if (tenant.SlackNotificationsEnabled && !string.IsNullOrWhiteSpace(tenant.SlackChannel))
        {
            var appBaseUrl = (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "http://localhost:5173").TrimEnd('/');
            _ = Task.Run(async () =>
            {
                try
                {
                    await _slackService.SendMessageAsync(tenant.Id.ToString(),
                        $"✅ Expense <{appBaseUrl}/expenses/{expenseId}|{expenseId}> approved by {email} via Slack slash command.",
                        tenant.SlackChannel);
                }
                catch { /* swallow */ }
            });
        }

        return Ok(new
        {
            response_type = "ephemeral",
            text = $"✅ Expense {expenseId} approved successfully by {approver.Email}!",
            replace_original = false
        });
    }

    private static async Task<string?> GetEmailFromSlackUserAsync(Tenant tenant, string slackUserId)
    {
        if (string.IsNullOrWhiteSpace(tenant.SlackUserEmailMappings))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(tenant.SlackUserEmailMappings);
            if (doc.RootElement.TryGetProperty(slackUserId, out var emailElement))
            {
                return emailElement.GetString();
            }
        }
        catch (JsonException)
        {
            // malformed JSON
        }

        return null;
    }
}
