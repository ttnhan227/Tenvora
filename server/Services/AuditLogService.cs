using System.Globalization;
using System.Text.Json;
using VeriSpend.Api.Common;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public Task LogExpenseCreatedAsync(Expense expense, string performedBy)
    {
        var details = BuildDetails(
            ("Amount", null, FormatDecimal(expense.Amount)),
            ("Currency", null, expense.Currency),
            ("Merchant", null, expense.Merchant),
            ("Category", null, expense.Category),
            ("Description", null, expense.Description),
            ("Status", null, expense.Status),
            ("Flagged", null, expense.Flagged ? "Yes" : "No"),
            ("FlagReason", null, expense.FlagReason),
            ("Date", null, expense.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)));

        return AddAuditLogAsync(expense.Id, "Created", performedBy, null, SerializeSnapshot(expense), details);
    }

    public Task LogExpenseUpdatedAsync(Expense before, Expense after, string performedBy)
    {
        var details = BuildDetails(
            ChangeIfDifferent("Amount", FormatDecimal(before.Amount), FormatDecimal(after.Amount)),
            ChangeIfDifferent("Currency", before.Currency, after.Currency),
            ChangeIfDifferent("Merchant", before.Merchant, after.Merchant),
            ChangeIfDifferent("Category", before.Category, after.Category),
            ChangeIfDifferent("Description", before.Description, after.Description),
            ChangeIfDifferent("Date", before.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), after.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
            ChangeIfDifferent("Flagged", before.Flagged ? "Yes" : "No", after.Flagged ? "Yes" : "No"),
            ChangeIfDifferent("FlagReason", before.FlagReason, after.FlagReason));

        return AddAuditLogAsync(after.Id, "Updated", performedBy, SerializeSnapshot(before), SerializeSnapshot(after), details);
    }

    public Task LogExpenseSubmittedAsync(Expense expense, string performedBy)
    {
        var details = BuildDetails(
            ("Status", ExpenseStatuses.Draft, ExpenseStatuses.Pending),
            ("Flagged", null, expense.Flagged ? "Yes" : "No"),
            ("FlagReason", null, expense.FlagReason));

        return AddAuditLogAsync(expense.Id, "Submitted", performedBy, SerializeStatusSnapshot(ExpenseStatuses.Draft), SerializeSnapshot(expense), details);
    }

    public Task LogExpenseApprovedAsync(Expense expense, string performedBy)
    {
        var details = BuildDetails(("Status", ExpenseStatuses.Pending, ExpenseStatuses.Approved));
        return AddAuditLogAsync(expense.Id, "Approved", performedBy, SerializeStatusSnapshot(ExpenseStatuses.Pending), SerializeSnapshot(expense), details);
    }

    public Task LogExpenseRejectedAsync(Expense expense, string performedBy, string reason)
    {
        var details = BuildDetails(
            ("Status", ExpenseStatuses.Pending, ExpenseStatuses.Rejected),
            ("Reason", null, reason));

        return AddAuditLogAsync(expense.Id, "Rejected", performedBy, SerializeStatusSnapshot(ExpenseStatuses.Pending), SerializeSnapshot(expense), details);
    }

    public Task LogExpenseDeletedAsync(Expense expense, string performedBy)
    {
        var details = BuildDetails(("IsDeleted", "No", "Yes"));
        return AddAuditLogAsync(expense.Id, "Deleted", performedBy, SerializeSnapshot(expense), null, details);
    }

    private Task AddAuditLogAsync(Guid expenseId, string action, string performedBy, string? oldValue, string? newValue, string details)
    {
        return _auditLogRepository.AddAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            ExpenseId = expenseId,
            Action = action,
            PerformedBy = performedBy,
            Timestamp = DateTime.UtcNow,
            OldValue = oldValue,
            NewValue = newValue,
            Notes = details,
        });
    }

    private static string SerializeSnapshot(Expense expense)
    {
        return JsonSerializer.Serialize(new
        {
            expense.Id,
            expense.Amount,
            expense.Currency,
            expense.Merchant,
            expense.Category,
            expense.Description,
            ExpenseDate = expense.Date,
            expense.Status,
            IsFlagged = expense.Flagged,
            expense.FlagReason,
            expense.IsDeleted,
        });
    }

    private static string SerializeStatusSnapshot(string status)
    {
        return JsonSerializer.Serialize(new { Status = status });
    }

    private static (string Field, string? Before, string? After)? ChangeIfDifferent(string field, string? before, string? after)
    {
        return string.Equals(before ?? string.Empty, after ?? string.Empty, StringComparison.Ordinal)
            ? null
            : (field, before, after);
    }

    private static string BuildDetails(params (string Field, string? Before, string? After)?[] changes)
    {
        var entries = changes
            .Where(change => change.HasValue)
            .Select(change => change!.Value)
            .Select(change => change.Before is null
                ? $"{change.Field}: {change.After}"
                : $"{change.Field}: {change.Before} -> {change.After}")
            .ToArray();

        return entries.Length == 0 ? "No field-level changes captured." : string.Join(" | ", entries);
    }

    private static string FormatDecimal(decimal value)
    {
        return value.ToString("0.00", CultureInfo.InvariantCulture);
    }
}