using Microsoft.Extensions.Logging;
using VeriSpend.Api.Dtos.Anomalies;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class NotificationService : INotificationService
{
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly ILogger<NotificationService> _logger;
    private readonly IEmailService _emailService;
    private readonly ISlackService _slackService;
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IExpenseRepository _expenseRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IServiceScopeFactory _scopeFactory;

    public NotificationService(
        IAuditLogRepository auditLogRepository,
        ILogger<NotificationService> logger,
        IEmailService emailService,
        ISlackService slackService,
        ITenantRepository tenantRepository,
        IUserRepository userRepository,
        IExpenseRepository expenseRepository,
        IHttpClientFactory httpClientFactory,
        IBackgroundTaskQueue taskQueue,
        IServiceScopeFactory scopeFactory)
    {
        _auditLogRepository = auditLogRepository;
        _logger = logger;
        _emailService = emailService;
        _slackService = slackService;
        _tenantRepository = tenantRepository;
        _userRepository = userRepository;
        _expenseRepository = expenseRepository;
        _httpClientFactory = httpClientFactory;
        _taskQueue = taskQueue;
        _scopeFactory = scopeFactory;
    }

    public async Task NotifyAnomalyDetectedAsync(Expense expense, string anomalyType, string anomalyReason, User employee)
    {
        var notification = new AnomalyNotification(
            expense.Id,
            expense.TenantId,
            employee.Email,
            expense.Merchant,
            expense.Amount,
            expense.Date,
            anomalyType,
            anomalyReason,
            DateTime.UtcNow
        );

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            ExpenseId = expense.Id,
            Action = "AnomalyDetected",
            PerformedBy = "AnomalyDetectionBot",
            NewValue = System.Text.Json.JsonSerializer.Serialize(notification),
            Timestamp = DateTime.UtcNow
        };

        await _auditLogRepository.AddAsync(auditLog);
        await _auditLogRepository.SaveChangesAsync();

        // Send notifications asynchronously without blocking
        await _taskQueue.QueueBackgroundWorkItemAsync(async token =>
        {
            using var scope = _scopeFactory.CreateScope();
            var scopedTenantRepo = scope.ServiceProvider.GetRequiredService<ITenantRepository>();
            var scopedUserRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var scopedEmailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var scopedSlackService = scope.ServiceProvider.GetRequiredService<ISlackService>();

            try
            {
                var tenant = await scopedTenantRepo.GetByIdAsync(expense.TenantId);
                if (tenant != null)
                {
                    if (tenant.EmailNotificationsEnabled)
                    {
                        var employeeObj = await scopedUserRepo.GetByIdAsync(expense.UserId);
                        if (employeeObj != null)
                        {
                            await scopedEmailService.SendExpenseFlaggedAsync(expense, anomalyType, anomalyReason, employeeObj);
                        }
                    }
                    if (tenant.SlackNotificationsEnabled)
                    {
                        await scopedSlackService.SendAnomalyAlertAsync(expense.TenantId.ToString(), expense, anomalyType, anomalyReason, employee);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send anomaly notification for expense {ExpenseId}", expense.Id);
            }
        });

        _logger.LogWarning(
            "Anomaly detected for expense {ExpenseId}: {Type} - {Reason}. Employee: {EmployeeEmail}",
            expense.Id,
            anomalyType,
            anomalyReason,
            employee.Email
        );
    }

    public async Task SendExpenseRejectedAsync(Expense expense, string rejectionReason, User approver)
    {
        try
        {
            var tenant = await _tenantRepository.GetByIdAsync(expense.TenantId);
            if (tenant == null)
            {
                _logger.LogWarning("Tenant not found for rejection notification: {TenantId}", expense.TenantId);
                return;
            }

            var employee = await _userRepository.GetByIdAsync(expense.UserId);
            if (employee == null)
            {
                _logger.LogWarning("User not found for expense {ExpenseId}", expense.Id);
                return;
            }

            var policyUrl = $"{GetAppBaseUrl()}/policies";
            await _emailService.SendExpenseRejectedAsync(expense, rejectionReason, approver, policyUrl);

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                ExpenseId = expense.Id,
                Action = "RejectionEmailSent",
                PerformedBy = approver.Id.ToString(),
                NewValue = $"Sent rejection email to {employee.Email}",
                Timestamp = DateTime.UtcNow
            };
            await _auditLogRepository.AddAsync(auditLog);
            await _auditLogRepository.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send rejection email for expense {ExpenseId}", expense.Id);
        }
    }

    public async Task SendWeeklyDigestAsync(Guid tenantId)
    {
        try
        {
            var tenant = await _tenantRepository.GetByIdAsync(tenantId);
            if (tenant == null)
            {
                _logger.LogWarning("Tenant not found for digest: {TenantId}", tenantId);
                return;
            }

            // Fetch pending and high-risk expenses
            var allExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
            var pendingExpenses = allExpenses.Where(e => e.Status == "Pending").ToList();
            var highRiskExpenses = allExpenses.Where(e => e.Flagged).ToList();

            var reportUrl = $"{GetAppBaseUrl()}/manager/review?tenant={tenantId}";
            var users = await _userRepository.GetByTenantIdAsync(tenantId);
            var recipients = users
                .Where(user => user.IsActive && user.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
                .Select(user => user.Email)
                .Append(tenant.ManagerEmail)
                .Where(email => !string.IsNullOrWhiteSpace(email))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var recipient in recipients)
            {
                await _emailService.SendWeeklyDigestAsync(tenant, pendingExpenses, highRiskExpenses, reportUrl, recipient!);
            }

            // Audit log
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "WeeklyDigestSent",
                PerformedBy = "WeeklyDigestBot",
                NewValue = $"Sent weekly digest to {recipients.Count} recipient(s) ({pendingExpenses.Count} pending, {highRiskExpenses.Count} high-risk)",
                Timestamp = DateTime.UtcNow
            };
            await _auditLogRepository.AddAsync(auditLog);
            await _auditLogRepository.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send weekly digest for tenant {TenantId}", tenantId);
        }
    }

    public async Task SendSlashCommandResponseAsync(string responseUrl, string message)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Slack");
            var payload = new { response_type = "ephemeral", text = message };
            var response = await client.PostAsJsonAsync(responseUrl, payload);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Slack slash command response: {Message}", ex.Message);
        }
    }

    private static string GetAppBaseUrl()
    {
        var baseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL");
        return string.IsNullOrWhiteSpace(baseUrl) ? "http://localhost:5173" : baseUrl;
    }
}
