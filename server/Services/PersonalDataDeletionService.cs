using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;

namespace Tenvora.Api.Services;

/// <summary>
/// Removes categories of the signed-in member's own data while keeping the account and
/// the shared business ledger intact. This is the "delete some of my data" path; deleting
/// everything, including the workspace, stays with <see cref="AccountDeletionService"/>.
/// </summary>
public sealed class PersonalDataDeletionService(AppDbContext db)
{
    public const string AiHistory = "ai_history";
    public const string ActivityTrail = "activity_trail";
    public const string Sessions = "sessions";

    public static readonly string[] Categories = [AiHistory, ActivityTrail, Sessions];

    public async Task<ApiResult> DeleteAsync(Guid tenantId, Guid userId, IReadOnlyCollection<string>? categories)
    {
        var requested = (categories ?? Array.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (requested.Count == 0) return ApiResult.Fail("Select at least one category of data to delete.");
        var unknown = requested.FirstOrDefault(c => !Categories.Contains(c, StringComparer.OrdinalIgnoreCase));
        if (unknown is not null) return ApiResult.Fail($"Unknown data category: {unknown}.");

        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId);
        if (user is null || !user.IsActive) return ApiResult.Fail("Account not found.");

        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        db.ErasingAccount = true; // Erasing rows must not recreate them as audit snapshots.
        try
        {
            var erased = new List<string>();

            if (requested.Contains(AiHistory, StringComparer.OrdinalIgnoreCase))
            {
                await EraseAiHistoryAsync(tenantId, userId);
                erased.Add("AI conversations, messages and proposals");
            }

            if (requested.Contains(ActivityTrail, StringComparer.OrdinalIgnoreCase))
            {
                await EraseActivityTrailAsync(tenantId, userId, user.Email);
                erased.Add("your identity in the activity history");
            }

            if (requested.Contains(Sessions, StringComparer.OrdinalIgnoreCase))
            {
                await RemoveRowsAsync(db.RefreshTokens.Where(t => t.UserId == userId));
                erased.Add("signed-in sessions on your devices");
            }

            await db.SaveChangesAsync();
            if (write != null) await write.CommitAsync();
            return ApiResult.Ok($"Deleted {string.Join(", ", erased)}. Your account and the shared business records were kept.");
        }
        finally { db.ErasingAccount = false; }
    }

    private async Task EraseAiHistoryAsync(Guid tenantId, Guid userId)
    {
        var conversationQuery = db.AiConversations.Where(c => c.TenantId == tenantId && c.UserId == userId);
        var conversationIds = await conversationQuery.Select(c => c.Id).ToListAsync();
        var messageQuery = db.AiConversationMessages.Where(m => m.TenantId == tenantId && conversationIds.Contains(m.ConversationId));
        var messageIds = await messageQuery.Select(m => m.Id).ToListAsync();
        var actionQuery = db.AiActions.Where(a => a.TenantId == tenantId && a.UserId == userId);
        var actionIds = await actionQuery.Select(a => a.Id).ToListAsync();
        var personalIds = conversationIds.Concat(messageIds).Concat(actionIds).Select(id => id.ToString()).ToList();

        // Drop the audit snapshots of erased AI records; they hold the conversation content.
        await RemoveRowsAsync(db.AuditLogs.Where(a => a.TenantId == tenantId &&
            (a.EntityType == "AiAction" || a.EntityType == "AiConversation" ||
             a.EntityType == "AiConversationMessage" || a.EntityType == "AiMessageReport") &&
            personalIds.Contains(a.EntityId)));

        await RemoveRowsAsync(messageQuery);
        await RemoveRowsAsync(actionQuery);
        await RemoveRowsAsync(conversationQuery);
    }

    private async Task EraseActivityTrailAsync(Guid tenantId, Guid userId, string email)
    {
        var entries = await db.AuditLogs.Where(a => a.TenantId == tenantId &&
            (a.UserId == userId || a.PerformedBy == email)).ToListAsync();

        // Profile-change entries carry snapshots of personal fields, so they go entirely.
        var profileEntries = entries
            .Where(a => a.EntityType == "User" && a.EntityId == userId.ToString())
            .ToList();
        if (profileEntries.Count > 0) db.RemoveRange(profileEntries);

        // The rest records shared business history: keep the record, drop the person.
        foreach (var entry in entries.Except(profileEntries))
        {
            entry.UserId = null;
            entry.IpAddress = null;
            entry.PerformedBy = "Identity removed";
        }
    }

    private async Task RemoveRowsAsync<T>(IQueryable<T> query) where T : class
    {
        if (db.Database.IsRelational()) await query.ExecuteDeleteAsync();
        else db.RemoveRange(await query.ToListAsync());
    }
}