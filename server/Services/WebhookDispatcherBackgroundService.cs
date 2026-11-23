using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Tenvora.Api.Services;

public sealed class WebhookDispatcherBackgroundService(
    IServiceScopeFactory scopeFactory,
    IOptions<WebhookOptions> options,
    ILogger<WebhookDispatcherBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var cfg = options.Value;
        if (!cfg.EnableBackgroundWorker)
        {
            logger.LogInformation("Webhook background dispatcher is disabled by configuration.");
            return;
        }

        var pollInterval = TimeSpan.FromSeconds(Math.Max(1, cfg.PollIntervalSeconds));
        using var timer = new PeriodicTimer(pollInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var deliveryService = scope.ServiceProvider.GetRequiredService<IWebhookDeliveryService>();
                await deliveryService.ProcessPendingBatchAsync(cfg.BatchSize, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while processing webhook outbox batch.");
            }

            try
            {
                if (!await timer.WaitForNextTickAsync(stoppingToken))
                    break;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
