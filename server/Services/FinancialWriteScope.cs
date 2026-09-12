using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Tenvora.Api.Data;

namespace Tenvora.Api.Services;

// Serializes workspace state transitions before reading mutable financial state.
// The transaction also covers idempotency records and all journal side effects.
internal static class FinancialWriteScope
{
    public static async Task<IDbContextTransaction?> BeginAsync(AppDbContext db, Guid tenantId)
    {
        if (!db.Database.IsRelational()) return null;
        var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({tenantId.ToString()}))");
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }
}
