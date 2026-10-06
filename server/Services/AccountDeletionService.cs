using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;

namespace Tenvora.Api.Services;

public sealed class AccountDeletionService(AppDbContext db)
{
    public async Task<ApiResult> DeleteAsync(Guid tenantId, Guid userId, string confirmation)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId);
        if (user is null || !user.IsActive) return ApiResult.Fail("Account not found.");
        if (!string.Equals(user.Email, confirmation?.Trim(), StringComparison.OrdinalIgnoreCase))
            return ApiResult.Fail("Enter your account email to confirm permanent deletion.");

        var others = await db.Users.Where(u => u.TenantId == tenantId && u.Id != userId).ToListAsync();
        if (user.Role == "TenantAdmin" && others.Count > 0 &&
            !others.Any(u => u.IsActive && u.Role == "TenantAdmin"))
            return ApiResult.Fail("Create another active administrator in Team before deleting your account. This keeps your team's business records accessible.");

        db.ErasingAccount = true;
        try
        {
            var conversationQuery = db.AiConversations.Where(c => c.TenantId == tenantId &&
                (others.Count == 0 || c.UserId == userId));
            var ids = await conversationQuery.Select(c => c.Id).ToListAsync();
            var messageQuery = db.AiConversationMessages.Where(m => m.TenantId == tenantId && ids.Contains(m.ConversationId));
            var messageIds = await messageQuery.Select(m => m.Id).ToListAsync();
            await RemoveRowsAsync(messageQuery);
            await RemoveRowsAsync(conversationQuery);
            var actionQuery = db.AiActions.Where(a => a.TenantId == tenantId && (others.Count == 0 || a.UserId == userId));
            var actionIds = await actionQuery.Select(a => a.Id).ToListAsync();
            await RemoveRowsAsync(actionQuery);
            var personalEntityIds = ids.Concat(messageIds).Concat(actionIds).Select(id => id.ToString()).ToList();
            await RemoveRowsAsync(db.RefreshTokens.Where(t => t.UserId == userId));
            await RemoveRowsAsync(db.AuditLogs.Where(a =>
                (a.TenantId == tenantId && (others.Count == 0 || (a.EntityType == "User" && a.EntityId == userId.ToString()) ||
                    ((a.EntityType == "AiAction" || a.EntityType == "AiConversation" || a.EntityType == "AiConversationMessage" || a.EntityType == "AiMessageReport") && personalEntityIds.Contains(a.EntityId)))) ||
                (others.Count == 0 && a.EntityType == "Tenant" && a.EntityId == tenantId.ToString())));

            if (others.Count == 0)
            {
                // Remove dependants explicitly; PostgreSQL restricts financial FKs.
                await RemoveRowsAsync(db.BusinessPayments.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.PurchasePayments.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.SaleItems.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.PurchaseItems.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.StockAdjustments.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.BusinessExpenses.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.Sales.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.Purchases.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.Customers.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.Suppliers.Where(x => x.TenantId == tenantId));
                await RemoveRowsAsync(db.Products.Where(x => x.TenantId == tenantId));
                var tenant = await db.Tenants.SingleAsync(t => t.Id == tenantId);
                db.Remove(tenant);
            }
            else
            {
                // Keep shared ledger history without retaining the deleted identity.
                foreach (var audit in await db.AuditLogs.Where(a => a.TenantId == tenantId && a.UserId == userId).ToListAsync())
                {
                    audit.UserId = null;
                    audit.PerformedBy = "Deleted account";
                    audit.IpAddress = null;
                }
                foreach (var row in await db.StockAdjustments.Where(x => x.TenantId == tenantId && x.UserId == userId).ToListAsync()) row.UserId = null;
                foreach (var row in await db.BusinessPayments.Where(x => x.TenantId == tenantId && x.ReversedByUserId == userId).ToListAsync()) row.ReversedByUserId = null;
                foreach (var row in await db.PurchasePayments.Where(x => x.TenantId == tenantId && x.ReversedByUserId == userId).ToListAsync()) row.ReversedByUserId = null;
            }
            db.Remove(user);
            await db.SaveChangesAsync();
            if (write != null) await write.CommitAsync();
            return ApiResult.Ok("Account deleted.");
        }
        finally { db.ErasingAccount = false; }
    }
    private async Task RemoveRowsAsync<T>(IQueryable<T> query) where T : class
    {
        if (db.Database.IsRelational()) await query.ExecuteDeleteAsync();
        else db.RemoveRange(await query.ToListAsync());
    }

}
