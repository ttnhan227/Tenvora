using Microsoft.Extensions.Logging;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public class DailySlackDigestBackgroundService : BackgroundService
{
    private readonly ILogger<DailySlackDigestBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private static readonly TimeSpan _runAtHour = TimeSpan.FromHours(9); // Run at 9 AM UTC daily

    public DailySlackDigestBackgroundService(
        ILogger<DailySlackDigestBackgroundService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Daily Slack Digest Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var nextRun = now.Date.Add(_runAtHour);

                // If we've already passed today's run time, schedule for tomorrow
                if (now >= nextRun)
                {
                    nextRun = nextRun.AddDays(1);
                }

                var delay = nextRun - now;
                _logger.LogInformation("Daily Slack digest scheduled to run in {DelayHours} hours at {RunTime}", delay.TotalHours, nextRun);

                await Task.Delay(delay, stoppingToken);

                using var scope = _scopeFactory.CreateScope();
                var tenantRepository = scope.ServiceProvider.GetRequiredService<ITenantRepository>();
                var slackService = scope.ServiceProvider.GetRequiredService<ISlackService>();
                var expenseRepository = scope.ServiceProvider.GetRequiredService<IExpenseRepository>();

                var tenants = await tenantRepository.GetAllAsync();
                var utcNow = DateTime.UtcNow;
                var appBaseUrl = (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "http://localhost:5173").TrimEnd('/');

                foreach (var tenant in tenants)
                {
                    if (!tenant.SlackNotificationsEnabled || string.IsNullOrWhiteSpace(tenant.SlackChannel))
                    {
                        continue;
                    }

                    try
                    {
                        var expenses = await expenseRepository.GetTenantExpensesAsync(tenant.Id);
                        var pendingCount = expenses.Count(e => e.Status == "Pending");
                        var highRiskCount = expenses.Count(e => e.Flagged);

                        var managerUrl = $"{appBaseUrl}/manager/pending";

                        await slackService.SendDailyDigestAsync(tenant.Id.ToString(), pendingCount, highRiskCount, managerUrl);
                        _logger.LogInformation("Daily Slack digest sent for tenant {TenantId} ({CompanyName}) — {Pending} pending, {HighRisk} high-risk",
                            tenant.Id, tenant.CompanyName, pendingCount, highRiskCount);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send daily Slack digest for tenant {TenantId}", tenant.Id);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in DailySlackDigestBackgroundService. Will retry in 1 hour.");
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken); // Backoff
            }
        }

        _logger.LogInformation("Daily Slack Digest Background Service is stopping.");
    }
}
