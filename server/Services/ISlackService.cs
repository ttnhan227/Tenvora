using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public interface ISlackService
{
    Task SendMessageAsync(string tenantId, string message, string? channel = null);
    Task SendAnomalyAlertAsync(string tenantId, Expense expense, string anomalyType, string anomalyReason, User employee);
    Task SendDailyDigestAsync(string tenantId, int pendingCount, int highRiskCount, string managerUrl);
    Task VerifyAndHandleSlashCommandAsync(HttpRequest request, string teamId, string userId, string command, string text, string responseUrl);
}
