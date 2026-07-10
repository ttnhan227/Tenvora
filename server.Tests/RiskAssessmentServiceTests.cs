using Server.Models;
using Server.Services;
using Xunit;

namespace Server.Tests;

public sealed class RiskAssessmentServiceTests
{
    private readonly RiskAssessmentService _sut = new();

    [Fact]
    public void EvaluateExpense_WhenNoSignalsExist_ReturnsLowRisk()
    {
        var expense = Expense(amount: 40, date: new DateTime(2026, 7, 8), description: "Customer meeting");

        var result = _sut.EvaluateExpense(expense, 500, [expense]);

        Assert.Equal(0, result.RiskScore);
        Assert.Equal("Low", result.RiskLevel);
        Assert.Empty(result.PolicyTriggers);
    }

    [Fact]
    public void EvaluateExpense_WhenPolicyAndBehaviorSignalsStack_CapsScoreAtOneHundred()
    {
        var userId = Guid.NewGuid();
        var expense = Expense(1_500, new DateTime(2026, 7, 12), "", "Alcohol", "Acme Bar", userId);
        var peers = new List<Expense>
        {
            Expense(100, expense.Date.AddDays(-1), "Dinner", "Alcohol", "Acme Bar", userId),
            Expense(1_500, expense.Date.AddDays(-2), "Dinner", "Alcohol", "Acme Bar", userId),
            Expense(80, expense.Date.AddDays(-3), "Dinner", "Alcohol", "Other", userId),
            Expense(90, expense.Date.AddDays(-4), "Dinner", "Alcohol", "Other", userId),
        };

        var result = _sut.EvaluateExpense(expense, 1_000, [expense, .. peers]);

        Assert.Equal(100, result.RiskScore);
        Assert.Equal("High", result.RiskLevel);
        Assert.Contains(result.PolicyTriggers, trigger => trigger.Contains("tenant limit"));
        Assert.Contains(result.PolicyTriggers, trigger => trigger.Contains("alcohol"));
        Assert.Contains(result.RiskReasons, reason => reason.Contains("duplicate"));
    }

    [Fact]
    public void DetectAnomalies_NormalizesMerchantAndDetectsRapidSubmission()
    {
        var userId = Guid.NewGuid();
        var expense = Expense(25, new DateTime(2026, 7, 8, 12, 0, 0), "Taxi", merchant: " Acme ", userId: userId);
        var peers = Enumerable.Range(1, 5)
            .Select(index => Expense(
                index == 1 ? 25 : 10 + index,
                expense.Date.AddHours(-index),
                "Taxi",
                merchant: index == 1 ? "ACME" : $"Merchant {index}",
                userId: userId))
            .ToList();

        var result = RiskAssessmentService.DetectAnomalies(expense, [expense, .. peers]);

        Assert.Contains("duplicate_detection", result.Flags);
        Assert.Contains("rapid_submission", result.Flags);
    }

    private static Expense Expense(
        decimal amount,
        DateTime date,
        string? description,
        string category = "Meals",
        string merchant = "Acme",
        Guid? userId = null) => new()
        {
            Id = Guid.NewGuid(),
            Amount = amount,
            Currency = "USD",
            Merchant = merchant,
            Category = category,
            Description = description,
            Status = "Draft",
            Date = DateTime.SpecifyKind(date, DateTimeKind.Utc),
            TenantId = Guid.NewGuid(),
            UserId = userId ?? Guid.NewGuid()
        };
}
