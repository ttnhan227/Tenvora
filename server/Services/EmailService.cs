namespace Tenvora.Api.Services;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody, string? plainTextBody = null);
    Task SendPaymentAlertAsync(string to, string referenceNumber, decimal amount, string currency, string status, string message);
}

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string to, string subject, string htmlBody, string? plainTextBody = null)
    {
        _logger.LogInformation("Simulated Email Sent to {To} with Subject: {Subject}", to, subject);
        return Task.CompletedTask;
    }

    public Task SendPaymentAlertAsync(string to, string referenceNumber, decimal amount, string currency, string status, string message)
    {
        _logger.LogInformation("Payment Alert Email sent to {To}: Transaction {Ref} ({Amount} {Currency}) status={Status}: {Msg}",
            to, referenceNumber, amount, currency, status, message);
        return Task.CompletedTask;
    }
}
