using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public class AutoApprovalService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AutoApprovalService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

    public AutoApprovalService(IServiceProvider serviceProvider, ILogger<AutoApprovalService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Auto-Approval Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAllTenantsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing auto-approvals");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task ProcessAllTenantsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var tenantRepository = scope.ServiceProvider.GetRequiredService<ITenantRepository>();
        var expenseService = scope.ServiceProvider.GetRequiredService<IExpenseService>();

        var tenants = await tenantRepository.GetAllAsync();
        var totalApproved = 0;

        foreach (var tenant in tenants.Where(t => t.AutoApprovalEnabled))
        {
            if (stoppingToken.IsCancellationRequested)
                break;

            var approved = await expenseService.ProcessAutoApprovalsAsync(tenant.Id);
            if (approved > 0)
            {
                _logger.LogInformation("Auto-approved {Count} expenses for tenant {TenantId}", approved, tenant.Id);
                totalApproved += approved;
            }
        }
    }
}