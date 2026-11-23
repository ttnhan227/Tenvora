using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Tenvora.Api.Common;
using Tenvora.Api.Data;

namespace Tenvora.Api.Services;

// Serializes workspace state transitions before reading mutable financial state.
// The transaction also covers idempotency records and all journal side effects.
internal static class FinancialWriteScope
{
    public static async Task<IDbContextTransaction?> BeginAsync(AppDbContext db, Guid tenantId)
    {
        using var activity = TenvoraTelemetry.ActivitySource.StartActivity("tenvora.financial_write_scope");
        activity?.SetTag("db.system", "postgresql");

        if (!db.Database.IsRelational())
        {
            activity?.SetTag("tenvora.lock.acquired", false);
            activity?.SetTag("tenvora.lock.reused_tx", false);
            activity?.SetTag("tenvora.lock.wait_ms", 0L);
            return null;
        }

        var sw = Stopwatch.StartNew();

        if (db.Database.CurrentTransaction != null)
        {
            activity?.SetTag("tenvora.lock.reused_tx", true);
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({tenantId.ToString()}))");
            sw.Stop();
            activity?.SetTag("tenvora.lock.acquired", true);
            activity?.SetTag("tenvora.lock.wait_ms", sw.ElapsedMilliseconds);
            return null;
        }

        activity?.SetTag("tenvora.lock.reused_tx", false);
        var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({tenantId.ToString()}))");
            sw.Stop();
            activity?.SetTag("tenvora.lock.acquired", true);
            activity?.SetTag("tenvora.lock.wait_ms", sw.ElapsedMilliseconds);
            return transaction;
        }
        catch
        {
            sw.Stop();
            activity?.SetTag("tenvora.lock.acquired", false);
            activity?.SetTag("tenvora.lock.wait_ms", sw.ElapsedMilliseconds);
            await transaction.DisposeAsync();
            throw;
        }
    }
}
