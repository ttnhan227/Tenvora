using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Models;

namespace Tenvora.Api.Controllers;

public record ReportAiMessageRequest([Required, MaxLength(500)] string Reason);

[ApiController, Authorize]
[Route("api/ai-feedback")]
public sealed class AiFeedbackController(AppDbContext db, ILogger<AiFeedbackController> logger) : ControllerBase
{
    [HttpPost("messages/{id:guid}/report")]
    public async Task<IActionResult> Report(Guid id, ReportAiMessageRequest request)
    {
        var tenant = User.GetTenantId(); var user = User.GetUserId();
        var message = await db.AiConversationMessages.Include(m => m.Conversation)
            .SingleOrDefaultAsync(m => m.Id == id && m.TenantId == tenant && m.Role == "assistant" && m.Conversation!.UserId == user);
        if (message is null) return NotFound(ApiResult.Fail("AI reply not found."));
        if (string.IsNullOrWhiteSpace(request.Reason)) return BadRequest(ApiResult.Fail("Choose a report reason."));
        if (!await db.AuditLogs.AnyAsync(a => a.TenantId == tenant && a.EntityType == "AiMessageReport" && a.EntityId == id.ToString() && a.UserId == user))
        {
            db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), TenantId = tenant, UserId = user,
                EntityType = "AiMessageReport", EntityId = id.ToString(), Action = "Reported",
                PerformedBy = "User report", Notes = request.Reason.Trim(), Origin = "Manual" });
            await db.SaveChangesAsync();
            // Never log the reported answer or financial context.
            logger.LogWarning("AI response report saved: tenant {TenantId}, message {MessageId}", tenant, id);
        }
        return Ok(ApiResult.Ok("Report received. Thank you."));
    }
}
