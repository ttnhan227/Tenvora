using VeriSpend.Api.Dtos.Expenses;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public interface IRiskAssessmentService
{
    RiskEvaluationResult EvaluateExpense(Expense expense, decimal maxSpendLimit, IReadOnlyCollection<Expense> tenantExpenses);
    Dictionary<Guid, RiskEvaluationResult> EvaluateExpenses(IEnumerable<Expense> expenses, decimal maxSpendLimit, IReadOnlyCollection<Expense> tenantExpenses);
}

public sealed record RiskEvaluationResult(int RiskScore, string RiskLevel, string[] RiskReasons, string[] PolicyTriggers)
{
    public RiskAssessmentResponse ToResponse() => new(RiskScore, RiskLevel, RiskReasons, PolicyTriggers);
}

public sealed class RiskAssessmentService : IRiskAssessmentService
{
    public RiskEvaluationResult EvaluateExpense(Expense expense, decimal maxSpendLimit, IReadOnlyCollection<Expense> tenantExpenses)
    {
        var reasons = new List<string>();
        var policyTriggers = new List<string>();
        var score = 0;

        if (expense.Amount > maxSpendLimit)
        {
            policyTriggers.Add($"Amount exceeds tenant limit of {maxSpendLimit:0.##}.");
            score += 35;
        }

        if (maxSpendLimit > 0 && expense.Amount >= maxSpendLimit * 0.9m && expense.Amount <= maxSpendLimit)
        {
            reasons.Add("Amount is close to the tenant spend limit and should be reviewed for threshold gaming.");
            score += 10;
        }

        if (ContainsRestrictedCategory(expense.Category))
        {
            policyTriggers.Add("Category violates alcohol spending policy.");
            score += 30;
        }

        if (string.IsNullOrWhiteSpace(expense.Description))
        {
            reasons.Add("Missing business justification or description.");
            score += 10;
        }

        if (IsWeekendExpense(expense.Date))
        {
            reasons.Add("Expense was recorded on a weekend.");
            score += 8;
        }

        var tenantAverage = CalculateTenantAverage(tenantExpenses, expense.Id);
        if (tenantAverage > 0 && expense.Amount >= tenantAverage * 1.75m)
        {
            reasons.Add($"Amount is unusually high compared with the tenant average of {tenantAverage:0.##}.");
            score += 18;
        }

        if (HasDuplicateLikeMatch(expense, tenantExpenses))
        {
            reasons.Add("Possible duplicate claim detected from merchant and amount similarity.");
            score += 25;
        }

        if (HasFrequentCategoryPattern(expense, tenantExpenses))
        {
            reasons.Add($"Employee submitted multiple {expense.Category.ToLowerInvariant()} claims in a short period.");
            score += 12;
        }

        reasons.InsertRange(0, policyTriggers);

        if (reasons.Count == 0)
        {
            reasons.Add("No unusual risk signals detected.");
        }

        score = Math.Min(score, 100);
        var riskLevel = score >= 70 ? "High" : score >= 35 ? "Medium" : "Low";

        return new RiskEvaluationResult(score, riskLevel, reasons.ToArray(), policyTriggers.ToArray());
    }

    public Dictionary<Guid, RiskEvaluationResult> EvaluateExpenses(IEnumerable<Expense> expenses, decimal maxSpendLimit, IReadOnlyCollection<Expense> tenantExpenses)
    {
        return expenses.ToDictionary(expense => expense.Id, expense => EvaluateExpense(expense, maxSpendLimit, tenantExpenses));
    }

    private static bool ContainsRestrictedCategory(string category)
    {
        return category.Contains("alcohol", StringComparison.OrdinalIgnoreCase)
            || category.Contains("wine", StringComparison.OrdinalIgnoreCase)
            || category.Contains("beer", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsWeekendExpense(DateTime date)
    {
        var dayOfWeek = date.DayOfWeek;
        return dayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
    }

    private static decimal CalculateTenantAverage(IReadOnlyCollection<Expense> tenantExpenses, Guid currentExpenseId)
    {
        var peerExpenses = tenantExpenses.Where(expense => expense.Id != currentExpenseId).ToList();
        return peerExpenses.Count == 0 ? 0m : peerExpenses.Average(expense => expense.Amount);
    }

    private static bool HasDuplicateLikeMatch(Expense expense, IReadOnlyCollection<Expense> tenantExpenses)
    {
        var normalizedMerchant = NormalizeMerchant(expense.Merchant);
        return tenantExpenses.Any(peer =>
            peer.Id != expense.Id
            && NormalizeMerchant(peer.Merchant) == normalizedMerchant
            && Math.Abs(peer.Amount - expense.Amount) < 0.01m
            && Math.Abs((peer.Date - expense.Date).TotalDays) <= 14);
    }

    private static bool HasFrequentCategoryPattern(Expense expense, IReadOnlyCollection<Expense> tenantExpenses)
    {
        var recentCount = tenantExpenses.Count(peer =>
            peer.Id != expense.Id
            && peer.UserId == expense.UserId
            && peer.Category.Equals(expense.Category, StringComparison.OrdinalIgnoreCase)
            && Math.Abs((peer.Date - expense.Date).TotalDays) <= 30);

        return recentCount >= 3;
    }

    private static string NormalizeMerchant(string merchant)
    {
        return merchant.Trim().ToUpperInvariant();
    }

    public static AnomalyDetectionResult DetectAnomalies(Expense expense, IReadOnlyCollection<Expense> tenantExpenses)
    {
        var anomalies = new List<string>();
        var flags = new List<string>();

        // Duplicate detection
        if (HasDuplicateLikeMatch(expense, tenantExpenses))
        {
            anomalies.Add("Possible duplicate claim detected");
            flags.Add("duplicate_detection");
        }

        // Rapid submission (5+ in 24h)
        var recentCount = tenantExpenses.Count(e => 
            e.UserId == expense.UserId && 
            e.Id != expense.Id &&
            Math.Abs((e.Date - expense.Date).TotalHours) <= 24);
        
        if (recentCount >= 5)
        {
            anomalies.Add("Unusually high submission frequency");
            flags.Add("rapid_submission");
        }

        return new AnomalyDetectionResult(anomalies.ToArray(), flags.ToArray());
    }

    public sealed record AnomalyDetectionResult(string[] Anomalies, string[] Flags);
}