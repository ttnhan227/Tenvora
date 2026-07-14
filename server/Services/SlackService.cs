using Microsoft.Extensions.Logging;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public class SlackService : ISlackService
{
    private readonly ILogger<SlackService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ITenantRepository _tenantRepository;

    public SlackService(
        ILogger<SlackService> logger,
        IHttpClientFactory httpClientFactory,
        ITenantRepository tenantRepository)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _tenantRepository = tenantRepository;
    }

    public async Task SendMessageAsync(string tenantId, string message, string? channel = null)
    {
        var tenant = await _tenantRepository.GetByIdAsync(Guid.Parse(tenantId));
        if (tenant == null)
        {
            _logger.LogWarning("Tenant not found for Slack notification: {TenantId}", tenantId);
            return;
        }

        if (!tenant.SlackNotificationsEnabled || string.IsNullOrWhiteSpace(tenant.SlackWebhookUrl))
        {
            _logger.LogDebug("Slack notifications disabled for tenant {TenantId}", tenantId);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("Slack");
            var payload = new
            {
                text = message,
                channel = channel ?? tenant.SlackChannel ?? "#general",
                username = "VeriSpend Bot",
                icon_emoji = ":robot_face:"
            };

            var response = await client.PostAsJsonAsync(tenant.SlackWebhookUrl, payload);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Slack message sent to tenant {TenantId}", tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Slack message for tenant {TenantId}: {Message}", tenantId, ex.Message);
            throw;
        }
    }

    public async Task SendAnomalyAlertAsync(string tenantId, Expense expense, string anomalyType, string anomalyReason, User employee)
    {
        var appBaseUrl = (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "http://localhost:5173").TrimEnd('/');
        var message = $":warning: *Anomaly Detected*\n\n" +
                      $"*Expense:* {expense.Merchant} - ${expense.Amount}\n" +
                      $"*Employee:* {employee.Email}\n" +
                      $"*Date:* {expense.Date:yyyy-MM-dd}\n" +
                      $"*Category:* {expense.Category}\n" +
                      $"*Type:* {anomalyType}\n" +
                      $"*Reason:* {anomalyReason}\n" +
                      $"<{appBaseUrl}/expenses/{expense.Id}|Review in VeriSpend>";

        await SendMessageAsync(tenantId, message);
    }

    public async Task SendDailyDigestAsync(string tenantId, int pendingCount, int highRiskCount, string managerUrl)
    {
        var message = $":calendar: *Daily Expense Digest*\n\n" +
                      $"*Pending review:* {pendingCount} expenses\n" +
                      $"*High-risk flagged:* {highRiskCount} expenses\n\n" +
                      $"<{managerUrl}|Open Manager Dashboard>";

        await SendMessageAsync(tenantId, message);
    }

    public Task VerifyAndHandleSlashCommandAsync(HttpRequest request, string teamId, string userId, string command, string text, string responseUrl)
    {
        _logger.LogInformation(
            "Legacy Slack slash handler invoked for team {TeamId}. SlackController handles /expense approvals.",
            teamId);
        return SendSlashResponse(responseUrl, "Use `/expense approve <expense-id>` through the `/api/slack/slash` request URL.");
    }

    private async Task SendSlashResponse(string responseUrl, string message)
    {
        var client = _httpClientFactory.CreateClient("Slack");
        var payload = new { response_type = "ephemeral", text = message };
        await client.PostAsJsonAsync(responseUrl, payload);
    }
}
