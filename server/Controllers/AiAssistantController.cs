using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ai/assistant")]
public class AiAssistantController : ControllerBase
{
    private readonly IAiAssistantService _aiService;
    private readonly IAiActionService _actionService;
    private readonly IAiAgentService _agentService;
    private readonly IConfiguration _config;

    public AiAssistantController(
        IAiAssistantService aiService,
        IAiActionService actionService,
        IAiAgentService agentService,
        IConfiguration config)
    {
        _aiService = aiService;
        _actionService = actionService;
        _agentService = agentService;
        _config = config;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var provider = _config["AI_PROVIDER_NAME"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_NAME") ?? "Google Gemini";
        var model = _config["AI_CHAT_MODEL"] ?? Environment.GetEnvironmentVariable("AI_CHAT_MODEL") ?? "gemini-3.8-flash";
        var hasKey = !string.IsNullOrWhiteSpace(_config["AI_PROVIDER_API_KEY"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER_API_KEY"));

        return Ok(ApiResult<object>.Ok(new
        {
            online = true,
            provider,
            model,
            hasApiKey = hasKey,
            features = new[]
            {
                "grounded_read", "typed_action_proposals", "confirmed_financial_actions", "entity_crud",
                "purchase_and_supplier_payments", "destructive_action_guardrails", "role_policy", "ui_context"
            }
        }));
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var result = await _aiService.ChatAsync(tenantId, request.Message, request.UiContext, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPost("parse-record")]
    public async Task<IActionResult> ParseRecord([FromBody] AiParseRecordRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var result = await _aiService.ParseRecordAsync(tenantId, request.Text, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPost("actions/propose")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> ProposeAction([FromBody] AiProposeActionRequest request, CancellationToken ct)
    {
        var result = await _actionService.ProposeAsync(User.GetTenantId(), User.GetUserId(), request, User.GetUserRole(), ct);
        return result.ToActionResult();
    }

    [HttpPost("actions/{actionId:guid}/confirm")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> ConfirmAction(Guid actionId, [FromBody] AiConfirmActionRequest request, CancellationToken ct)
    {
        var result = await _actionService.ConfirmAsync(
            User.GetTenantId(), User.GetUserId(), actionId, request.Confirmed, User.GetUserRole(), ct);
        return result.ToActionResult();
    }

    [HttpPost("agent-chat")]
    public async Task<IActionResult> AgentChat([FromBody] AiAgentChatRequest request, CancellationToken ct)
    {
        var result = await _agentService.AgentChatAsync(
            User.GetTenantId(), User.GetUserId(), request, User.GetUserRole(), ct);
        return result.ToActionResult();
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken ct)
    {
        var result = await _agentService.GetConversationsAsync(
            User.GetTenantId(), User.GetUserId(), ct);
        return result.ToActionResult();
    }

    [HttpGet("conversations/{id:guid}")]
    public async Task<IActionResult> GetConversation(Guid id, CancellationToken ct)
    {
        var result = await _agentService.GetConversationAsync(
            User.GetTenantId(), User.GetUserId(), id, ct);
        return result.ToActionResult();
    }

    [HttpDelete("conversations/{id:guid}")]
    public async Task<IActionResult> DeleteConversation(Guid id, CancellationToken ct)
    {
        var result = await _agentService.DeleteConversationAsync(
            User.GetTenantId(), User.GetUserId(), id, ct);
        return result.ToActionResult();
    }
}
