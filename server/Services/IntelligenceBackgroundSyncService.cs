namespace Tenvora.Api.Services;

public class IntelligenceBackgroundSyncService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<IntelligenceBackgroundSyncService> _logger;

    public IntelligenceBackgroundSyncService(IServiceProvider serviceProvider, ILogger<IntelligenceBackgroundSyncService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IntelligenceBackgroundSyncService started.");

        // Initial delay so application finishes bootstrapping first
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var intelligenceService = scope.ServiceProvider.GetRequiredService<IIntelligenceService>();
                await intelligenceService.SyncFeedsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Background intelligence feed sync encountered an error; retrying on next cycle.");
            }

            // Sync every 30 minutes
            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }
    }
}
