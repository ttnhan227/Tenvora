using VeriSpend.Api.Models;
using VeriSpend.Api.Services;
using Xunit;

namespace VeriSpend.Api.Tests;

public sealed class ReviewAssistantServiceTests
{
    private readonly ReviewAssistantService _sut = new();

    [Fact]
    public void BuildReview_WhenExpenseHasMissingReceiptAndDescription_FlagsMissingEvidence()
    {
        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            Amount = 150m,
            Currency = "USD",
            Merchant = "Uber",
            Category = "Travel",
            Description = "", // Missing
            Status = "Pending",
            Date = DateTime.UtcNow.AddDays(-2),
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid()
        };

        var assessment = new RiskEvaluationResult(
            RiskScore: 10,
            RiskLevel: "Low",
            RiskReasons: ["Routine travel expense"],
            PolicyTriggers: []
        );

        var review = _sut.BuildReview(expense.Id, [expense], expense, assessment);

        Assert.NotNull(review);
        Assert.Contains(review.MissingEvidence, item => item.Contains("Receipt attachment is missing"));
        Assert.Contains(review.MissingEvidence, item => item.Contains("Business justification is missing"));
    }

    [Fact]
    public void BuildReview_WhenDuplicateMerchantAndAmountDetected_FlagsSuspiciousPattern()
    {
        var userId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var expense1 = new Expense
        {
            Id = Guid.NewGuid(),
            Amount = 45m,
            Currency = "USD",
            Merchant = "Delta Airlines",
            Category = "Travel",
            Description = "Baggage fee",
            Status = "Approved",
            Date = now.AddDays(-3),
            TenantId = Guid.NewGuid(),
            UserId = userId
        };

        var expense2 = new Expense
        {
            Id = Guid.NewGuid(),
            Amount = 45m,
            Currency = "Delta Airlines",
            Merchant = "Delta Airlines",
            Category = "Travel",
            Description = "Baggage fee claim",
            Status = "Pending",
            Date = now.AddDays(-1),
            TenantId = expense1.TenantId,
            UserId = userId
        };

        var assessment = new RiskEvaluationResult(
            RiskScore: 60,
            RiskLevel: "Medium",
            RiskReasons: ["Possible duplicate detected"],
            PolicyTriggers: []
        );

        var review = _sut.BuildReview(expense2.Id, [expense1, expense2], expense2, assessment);

        Assert.NotNull(review);
        Assert.Contains(review.SuspiciousPatterns, pattern => pattern.Contains("Possible duplicate claim"));
    }
}
