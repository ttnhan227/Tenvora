using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly EmailSettings _emailSettings;

    public EmailService(
        ILogger<EmailService> logger,
        IHttpClientFactory httpClientFactory,
        IOptions<EmailSettings> emailSettings)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _emailSettings = emailSettings.Value;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, string? plainTextBody = null)
    {
        if (!_emailSettings.Enabled)
        {
            _logger.LogDebug("Email sending disabled. Skipping email to {To}", to);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("Email");

            var emailMessage = new
            {
                to,
                from = _emailSettings.FromEmail ?? "noreply@verispend.local",
                subject,
                htmlBody,
                plainTextBody = plainTextBody ?? StripHtml(htmlBody)
            };

            // Using SendGrid API (recommended) or SMTP relay
            if (!string.IsNullOrWhiteSpace(_emailSettings.SendGridApiKey))
            {
                await SendViaSendGrid(emailMessage);
            }
            else if (!string.IsNullOrWhiteSpace(_emailSettings.SmtpHost))
            {
                await SendViaSmtp(emailMessage);
            }
            else
            {
                _logger.LogWarning("No email provider configured (SendGrid API key or SMTP settings)");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}: {Message}", to, ex.Message);
            throw;
        }
    }

    private async Task SendViaSendGrid(dynamic emailMessage)
    {
        var client = _httpClientFactory.CreateClient("SendGrid");
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_emailSettings.SendGridApiKey}");

        var payload = new
        {
            personalizations = new[]
            {
                new { to = new[] { new { email = emailMessage.to } } }
            },
            from = new { email = emailMessage.from, name = _emailSettings.FromName ?? "VeriSpend" },
            subject = emailMessage.subject,
            content = new[]
            {
                new { type = "text/plain", value = emailMessage.plainTextBody },
                new { type = "text/html", value = emailMessage.htmlBody }
            }
        };

            var response = await client.PostAsJsonAsync("https://api.sendgrid.com/v3/mail/send", payload);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Email sent via SendGrid to {To}", (string)emailMessage.to);
    }

    private async Task SendViaSmtp(dynamic emailMessage)
    {
        var smtpClient = new System.Net.Mail.SmtpClient(_emailSettings.SmtpHost, _emailSettings.SmtpPort ?? 587);
        smtpClient.EnableSsl = _emailSettings.SmtpUseSsl ?? true;
        if (!string.IsNullOrWhiteSpace(_emailSettings.SmtpUsername))
        {
            smtpClient.Credentials = new System.Net.NetworkCredential(
                _emailSettings.SmtpUsername,
                _emailSettings.SmtpPassword ?? "");
        }

        var mailMessage = new System.Net.Mail.MailMessage
        {
            From = new System.Net.Mail.MailAddress(emailMessage.from, _emailSettings.FromName ?? "VeriSpend"),
            Subject = emailMessage.subject,
            Body = emailMessage.htmlBody,
            IsBodyHtml = true
        };
        mailMessage.To.Add(emailMessage.to);

        await smtpClient.SendMailAsync(mailMessage);
        _logger.LogInformation("Email sent via SMTP to {To}", (string)emailMessage.to);
    }

    public async Task SendExpenseRejectedAsync(Expense expense, string rejectionReason, User approver, string policyUrl)
    {
        var subject = $"Expense Rejected: {expense.Merchant} - ${expense.Amount}";
        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
        .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
        .details {{ background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }}
        .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }}
        .policy-link {{ display: inline-block; background: #667eea; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }}
        .reason {{ background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }}
        h1 {{ margin: 0; font-size: 24px; }}
        .label {{ font-weight: 600; color: #374151; }}
    </style>
</head>
<body>
    <div class='header'>
        <h1>Expense Rejected</h1>
    </div>
    <div class='content'>
        <p>Your expense submission has been reviewed and <strong>rejected</strong>.</p>
        
            <div class='details'>
                <p><span class='label'>Merchant:</span> {expense.Merchant}</p>
                <p><span class='label'>Amount:</span> ${expense.Amount}</p>
                <p><span class='label'>Date:</span> {expense.Date:yyyy-MM-dd}</p>
                <p><span class='label'>Category:</span> {expense.Category}</p>
                <p><span class='label'>Reviewed By:</span> {approver.Email}</p>
            </div>

        <div class='reason'>
            <p><strong>Reason for rejection:</strong></p>
            <p>{rejectionReason}</p>
        </div>

        <p>Please review the company expense policy for guidance on permissible expenses:</p>
        <a href='{policyUrl}' class='policy-link'>View Expense Policy</a>
    </div>
    <div class='footer'>
        <p>This email was sent automatically by VeriSpend.</p>
        <p>If you believe this is an error, please contact your manager or finance team.</p>
    </div>
</body>
</html>";

        var plainText = $@"
Expense Rejected

Your expense submission has been reviewed and REJECTED.

Merchant: {expense.Merchant}
Amount: ${expense.Amount}
Date: {expense.Date:yyyy-MM-dd}
Category: {expense.Category}
Reviewed By: {approver.Email}

Reason for rejection:
{rejectionReason}

Please review the company expense policy: {policyUrl}

---
VeriSpend
";

        await SendAsync(expense.User.Email, subject, htmlBody, plainText);
    }

    public async Task SendExpenseFlaggedAsync(Expense expense, string anomalyType, string anomalyReason, User employee)
    {
        var subject = $"Your Expense Was Flagged: {expense.Merchant} - ${expense.Amount}";
        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
        .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
        .details {{ background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }}
        .alert {{ background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }}
        h1 {{ margin: 0; font-size: 24px; }}
        .label {{ font-weight: 600; color: #374151; }}
    </style>
</head>
<body>
    <div class='header'>
        <h1>Expense Flagged for Review</h1>
    </div>
    <div class='content'>
        <p>Our system has flagged one of your expense submissions for further review.</p>
        <p>This doesn't mean the expense is invalid — it just requires additional attention from the finance team.</p>
        
        <div class='details'>
            <p><span class='label'>Merchant:</span> {expense.Merchant}</p>
            <p><span class='label'>Amount:</span> ${expense.Amount}</p>
            <p><span class='label'>Date:</span> {expense.Date:yyyy-MM-dd}</p>
            <p><span class='label'>Category:</span> {expense.Category}</p>
        </div>

        <div class='alert'>
            <p><strong>Flagged as:</strong> {anomalyType}</p>
            <p><strong>Details:</strong> {anomalyReason}</p>
        </div>

        <p>You may be contacted by a manager for additional information. Thank you for your patience.</p>
    </div>
    <div class='footer'>
        <p>This email was sent automatically by VeriSpend.</p>
    </div>
</body>
</html>";

        var plainText = $@"
Expense Flagged for Review

Our system has flagged one of your expense submissions for further review.
This doesn't mean the expense is invalid — it just requires additional attention.

Merchant: {expense.Merchant}
Amount: ${expense.Amount}
Date: {expense.Date:yyyy-MM-dd}
Category: {expense.Category}

Flagged as: {anomalyType}
Details: {anomalyReason}

You may be contacted by a manager for additional information.
---
VeriSpend
";

        await SendAsync(employee.Email, subject, htmlBody, plainText);
    }

    public async Task SendWeeklyDigestAsync(Tenant tenant, IReadOnlyList<Expense> pendingExpenses, IReadOnlyList<Expense> highRiskExpenses, string reportUrl)
    {
        var recipient = tenant.ManagerEmail;
        if (string.IsNullOrWhiteSpace(recipient))
        {
            _logger.LogWarning("No ManagerEmail configured for tenant {TenantId}, skipping weekly digest", tenant.Id);
            return;
        }

        await SendWeeklyDigestAsync(tenant, pendingExpenses, highRiskExpenses, reportUrl, recipient);
    }

    public async Task SendWeeklyDigestAsync(Tenant tenant, IReadOnlyList<Expense> pendingExpenses, IReadOnlyList<Expense> highRiskExpenses, string reportUrl, string recipientEmail)
    {
        var subject = $"Weekly Expense Digest — {tenant.CompanyName}";
        var totalPending = pendingExpenses.Count;
        var totalHighRisk = highRiskExpenses.Count;
        var totalAmount = pendingExpenses.Sum(e => e.Amount);

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
        .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
        .stats {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }}
        .stat-box {{ background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }}
        .stat-number {{ font-size: 32px; font-weight: 700; color: #111827; }}
        .stat-label {{ font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
        .high-risk {{ color: #dc2626; }}
        .expense-item {{ background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border: 1px solid #e5e7eb; font-size: 14px; }}
        .cta {{ display: inline-block; background: #667eea; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }}
        h1 {{ margin: 0; font-size: 24px; }}
    </style>
</head>
<body>
    <div class='header'>
        <h1>Weekly Expense Digest</h1>
        <p>{tenant.CompanyName}</p>
    </div>
    <div class='content'>
        <p>Here's a summary of expenses that need your attention this week:</p>

        <div class='stats'>
            <div class='stat-box'>
                <div class='stat-number'>{totalPending}</div>
                <div class='stat-label'>Pending Review</div>
            </div>
            <div class='stat-box'>
                <div class='stat-number high-risk'>{totalHighRisk}</div>
                <div class='stat-label'>High Risk</div>
            </div>
        </div>

        <p><strong>Total amount pending:</strong> ${totalAmount:N2}</p>";

        if (highRiskExpenses.Any())
        {
            htmlBody += "<h3>High-Risk Expenses</h3>";
            foreach (var exp in highRiskExpenses.Take(5))
            {
                htmlBody += $@"
                <div class='expense-item'>
                    <strong>{exp.Merchant}</strong> — ${exp.Amount} by {exp.User?.Email ?? "Unknown"}<br>
                    <small>{exp.Date:yyyy-MM-dd} | {exp.Category}</small>
                </div>";
            }
        }

        htmlBody += $@"
        <a href='{reportUrl}' class='cta'>Review All Expenses</a>
    </div>
    <div class='footer'>
        <p>This weekly digest is sent to owners and managers automatically.</p>
        <p><a href='#' style='color: #667eea;'>Manage notification preferences</a></p>
    </div>
</body>
</html>";

        var plainText = $@"
Weekly Expense Digest — {tenant.CompanyName}

Pending Review: {totalPending}
High-Risk: {totalHighRisk}
Total Pending Amount: ${totalAmount:N2}

{(highRiskExpenses.Any() ? "High-Risk Expenses:\n" + string.Join("\n", highRiskExpenses.Take(5).Select(e => $"- {e.Merchant} (${e.Amount}) by {e.User?.Email}")) : "")}
View full report: {reportUrl}

---
VeriSpend
";

        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            _logger.LogWarning("No recipient configured for tenant {TenantId}, skipping weekly digest", tenant.Id);
            return;
        }

        await SendAsync(recipientEmail, subject, htmlBody, plainText);
    }

    private static string StripHtml(string html)
    {
        return System.Text.RegularExpressions.Regex.Replace(html, "<.*?>", string.Empty)
            .Replace("&nbsp;", " ")
            .Replace("&amp;", "&")
            .Replace("&lt;", "<")
            .Replace("&gt;", ">");
    }
}

public class EmailSettings
{
    public bool Enabled { get; set; } = true;
    public string? FromEmail { get; set; }
    public string? FromName { get; set; }
    public string? SendGridApiKey { get; set; }
    public string? SmtpHost { get; set; }
    public int? SmtpPort { get; set; }
    public bool? SmtpUseSsl { get; set; }
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }
}
