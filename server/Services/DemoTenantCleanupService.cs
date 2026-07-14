using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Data;

namespace VeriSpend.Api.Services;

public sealed class DemoTenantCleanupService : BackgroundService
{
    private readonly IDbContextFactory<AppDbContext> _contextFactory;
    private readonly ILogger<DemoTenantCleanupService> _logger;

    public DemoTenantCleanupService(IDbContextFactory<AppDbContext> contextFactory, ILogger<DemoTenantCleanupService> logger)
    {
        _contextFactory = contextFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(30));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DeleteExpiredDemosAsync(stoppingToken);
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to clean up expired demo tenants.");
            }

            if (!await timer.WaitForNextTickAsync(stoppingToken)) break;
        }
    }

    private async Task DeleteExpiredDemosAsync(CancellationToken cancellationToken)
    {
        await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE public.\"Tenants\" DISABLE ROW LEVEL SECURITY", cancellationToken);
        try
        {
            var expired = await context.Tenants
                .Where(tenant => tenant.IsDemo && tenant.DemoExpiresAt < DateTime.UtcNow)
                .ToListAsync(cancellationToken);
            if (expired.Count > 0)
            {
                context.Tenants.RemoveRange(expired);
                await context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Removed {Count} expired demo tenant(s).", expired.Count);
            }
        }
        finally
        {
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE public.\"Tenants\" ENABLE ROW LEVEL SECURITY", cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
    }
}
