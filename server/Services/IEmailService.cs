using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody, string? plainTextBody = null);
    Task SendExpenseRejectedAsync(Expense expense, string rejectionReason, User approver, string policyUrl);
    Task SendExpenseFlaggedAsync(Expense expense, string anomalyType, string anomalyReason, User employee);
    Task SendWeeklyDigestAsync(Tenant tenant, IReadOnlyList<Expense> pendingExpenses, IReadOnlyList<Expense> highRiskExpenses, string reportUrl);
    Task SendWeeklyDigestAsync(Tenant tenant, IReadOnlyList<Expense> pendingExpenses, IReadOnlyList<Expense> highRiskExpenses, string reportUrl, string recipientEmail);
}
