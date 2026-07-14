using Microsoft.Extensions.Logging;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public class WeeklyDigestBackgroundService : BackgroundService
{
    private readonly ILogger<WeeklyDigestBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24); // Daily check

    public WeeklyDigestBackgroundService(
        ILogger<WeeklyDigestBackgroundService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Weekly Digest Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Run daily check
                await Task.Delay(_checkInterval, stoppingToken);

                using var scope = _scopeFactory.CreateScope();
                var tenantRepository = scope.ServiceProvider.GetRequiredService<ITenantRepository>();
                var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                var tenants = await tenantRepository.GetAllAsync();
                var utcNow = DateTime.UtcNow;

                if (utcNow.DayOfWeek != DayOfWeek.Monday)
                {
                    continue;
                }

                foreach (var tenant in tenants)
                {
                    if (!tenant.EmailNotificationsEnabled)
                    {
                        continue;
                    }

                    try
                    {
                        await notificationService.SendWeeklyDigestAsync(tenant.Id);
                        _logger.LogInformation("Weekly digest sent for tenant {TenantId} ({CompanyName})", tenant.Id, tenant.CompanyName);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send weekly digest for tenant {TenantId}", tenant.Id);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Service is stopping
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in WeeklyDigestBackgroundService. Will retry after interval.");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Backoff on error
            }
        }

        _logger.LogInformation("Weekly Digest Background Service is stopping.");
    }
}
