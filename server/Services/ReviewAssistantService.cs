using VeriSpend.Api.Dtos.Expenses;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public interface IReviewAssistantService
{
    ReviewAssistantResponse BuildReview(Guid expenseId, IEnumerable<Expense> tenantExpenses, Expense expense, RiskEvaluationResult assessment);
}

public sealed class ReviewAssistantService : IReviewAssistantService
{
    public ReviewAssistantResponse BuildReview(Guid expenseId, IEnumerable<Expense> tenantExpenses, Expense expense, RiskEvaluationResult assessment)
    {
        var tenantExpenseList = tenantExpenses.ToList();
        var peers = tenantExpenseList
            .Where(candidate => candidate.Id != expenseId)
            .OrderBy(candidate => Math.Abs((candidate.Date - expense.Date).TotalDays))
            .ToList();

        var relatedExpenses = peers
            .Where(candidate => candidate.Merchant.Equals(expense.Merchant, StringComparison.OrdinalIgnoreCase)
                || candidate.Category.Equals(expense.Category, StringComparison.OrdinalIgnoreCase)
                || candidate.UserId == expense.UserId)
            .OrderByDescending(candidate => GetSimilarityScore(expense, candidate))
            .ThenByDescending(candidate => candidate.Date)
            .Take(3)
            .Select(candidate => new RelatedExpenseResponse(
                candidate.Id,
                candidate.User?.Email ?? "Unknown employee",
                candidate.Amount,
                candidate.Currency,
                candidate.Merchant,
                candidate.Category,
                candidate.Status,
                candidate.Date,
                BuildRelationshipLabel(expense, candidate)))
            .ToArray();

        var missingEvidence = BuildMissingEvidence(expense).ToArray();
        var suspiciousPatterns = BuildSuspiciousPatterns(expense, peers, relatedExpenses).ToArray();
        var reviewerPrompts = BuildReviewerPrompts(expense, assessment, relatedExpenses).ToArray();
        var recommendation = DetermineRecommendation(expense, assessment, missingEvidence, relatedExpenses);
        var confidence = DetermineConfidence(assessment, missingEvidence, relatedExpenses);
        var summary = BuildSummary(expense, assessment, recommendation, missingEvidence, suspiciousPatterns, relatedExpenses);

        return new ReviewAssistantResponse(recommendation, confidence, summary, missingEvidence, reviewerPrompts, suspiciousPatterns, relatedExpenses);
    }

    private static IEnumerable<string> BuildMissingEvidence(Expense expense)
    {
        if (expense.Receipts.Count == 0)
        {
            yield return "Receipt attachment is missing.";
        }

        if (string.IsNullOrWhiteSpace(expense.Description))
        {
            yield return "Business justification is missing.";
        }

        if (expense.Date.Date > DateTime.UtcNow.Date)
        {
            yield return "Expense date is in the future and should be confirmed.";
        }
    }

    private static IEnumerable<string> BuildSuspiciousPatterns(Expense expense, IReadOnlyCollection<Expense> peers, IReadOnlyCollection<RelatedExpenseResponse> relatedExpenses)
    {
        if (peers.Any(candidate => candidate.Merchant.Equals(expense.Merchant, StringComparison.OrdinalIgnoreCase)
            && candidate.Amount == expense.Amount
            && Math.Abs((candidate.Date - expense.Date).TotalDays) <= 14))
        {
            yield return "Possible duplicate claim: same merchant and amount appeared within the last 14 days.";
        }

        var receiptUrls = expense.Receipts
            .Select(receipt => receipt.FileUrl)
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (receiptUrls.Count > 0 && peers.Any(candidate => candidate.Receipts.Any(receipt => receiptUrls.Contains(receipt.FileUrl))))
        {
            yield return "Receipt reuse detected: at least one uploaded file also appears on another claim.";
        }

        if (peers.Count(candidate => candidate.UserId == expense.UserId
            && candidate.Category.Equals(expense.Category, StringComparison.OrdinalIgnoreCase)
            && Math.Abs((candidate.Date - expense.Date).TotalDays) <= 30) >= 3)
        {
            yield return $"High frequency pattern: this employee submitted multiple {expense.Category.ToLowerInvariant()} claims in the last 30 days.";
        }

        if (relatedExpenses.Any(item => item.Relationship.Contains("Same employee", StringComparison.OrdinalIgnoreCase)
            && item.Relationship.Contains("Same merchant", StringComparison.OrdinalIgnoreCase)))
        {
            yield return "Repeated merchant pattern: the same employee has recent claims with this merchant.";
        }
    }

    private static IEnumerable<string> BuildReviewerPrompts(Expense expense, RiskEvaluationResult assessment, IEnumerable<RelatedExpenseResponse> relatedExpenses)
    {
        foreach (var trigger in assessment.PolicyTriggers)
        {
            yield return $"Validate policy exception handling for: {trigger}";
        }

        if (assessment.RiskScore >= 70)
        {
            yield return "Confirm manager notes explain why this claim should proceed despite the elevated score.";
        }

        if (relatedExpenses.Any(item => item.Relationship.Contains("Similar amount", StringComparison.OrdinalIgnoreCase)))
        {
            yield return "Check whether recent comparable claims represent a split purchase or duplicate reimbursement.";
        }

        if (expense.Receipts.Count > 0)
        {
            yield return "Verify the attached receipt matches the merchant, amount, and date shown on the claim.";
        }
    }

    private static string DetermineRecommendation(Expense expense, RiskEvaluationResult assessment, IReadOnlyCollection<string> missingEvidence, IReadOnlyCollection<RelatedExpenseResponse> relatedExpenses)
    {
        if (assessment.PolicyTriggers.Length >= 2 || assessment.RiskScore >= 80)
        {
            return "Escalate";
        }

        if (missingEvidence.Count > 0 || relatedExpenses.Count > 0 || assessment.RiskScore >= 45)
        {
            return "Needs review";
        }

        return expense.Receipts.Count > 0 ? "Approve with normal review" : "Needs review";
    }

    private static string DetermineConfidence(RiskEvaluationResult assessment, IReadOnlyCollection<string> missingEvidence, IReadOnlyCollection<RelatedExpenseResponse> relatedExpenses)
    {
        if (assessment.RiskScore >= 75 || missingEvidence.Count >= 2)
        {
            return "High";
        }

        if (assessment.RiskScore >= 40 || relatedExpenses.Count > 0 || missingEvidence.Count == 1)
        {
            return "Medium";
        }

        return "Low";
    }

    private static string BuildSummary(Expense expense, RiskEvaluationResult assessment, string recommendation, IReadOnlyCollection<string> missingEvidence, IReadOnlyCollection<string> suspiciousPatterns, IReadOnlyCollection<RelatedExpenseResponse> relatedExpenses)
    {
        var lead = $"{recommendation} for {expense.Merchant} at {expense.Amount:0.##} {expense.Currency}.";
        var signal = assessment.PolicyTriggers.Length > 0
            ? $" Policy triggers fired: {string.Join("; ", assessment.PolicyTriggers)}."
            : assessment.RiskReasons.Length > 0
                ? $" Main review signal: {assessment.RiskReasons[0]}."
                : " No unusual signals were detected.";
        var evidence = missingEvidence.Count > 0
            ? $" Missing evidence: {string.Join(" ", missingEvidence)}"
            : " Evidence appears complete based on the submitted fields.";
        var suspicious = suspiciousPatterns.Count > 0
            ? $" Suspicious pattern noted: {suspiciousPatterns.First()}"
            : string.Empty;
        var comparisons = relatedExpenses.Count > 0
            ? $" Found {relatedExpenses.Count} comparable recent claims for cross-checking."
            : string.Empty;

        return string.Concat(lead, signal, evidence, suspicious, comparisons).Trim();
    }

    private static decimal GetSimilarityScore(Expense source, Expense candidate)
    {
        decimal score = 0;

        if (candidate.Merchant.Equals(source.Merchant, StringComparison.OrdinalIgnoreCase))
        {
            score += 5;
        }

        if (candidate.Category.Equals(source.Category, StringComparison.OrdinalIgnoreCase))
        {
            score += 3;
        }

        if (candidate.UserId == source.UserId)
        {
            score += 2;
        }

        if (candidate.Amount == source.Amount)
        {
            score += 4;
        }

        var dayGap = Math.Abs((candidate.Date - source.Date).Days);
        score += Math.Max(0, 5 - dayGap);

        return score;
    }

    private static string BuildRelationshipLabel(Expense source, Expense candidate)
    {
        var labels = new List<string>();

        if (candidate.UserId == source.UserId)
        {
            labels.Add("Same employee");
        }

        if (candidate.Merchant.Equals(source.Merchant, StringComparison.OrdinalIgnoreCase))
        {
            labels.Add("Same merchant");
        }

        if (candidate.Category.Equals(source.Category, StringComparison.OrdinalIgnoreCase))
        {
            labels.Add("Same category");
        }

        if (candidate.Amount == source.Amount)
        {
            labels.Add("Similar amount");
        }

        return labels.Count > 0 ? string.Join(" · ", labels) : "Recent comparable claim";
    }
}