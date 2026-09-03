using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public class RiskServiceTests
{
    [Fact]
    public void EvaluatePayment_UnderThreshold_ReturnsLowRiskApproved()
    {
        var riskService = new RiskService();
        var pReq = new PaymentRequest { Id = Guid.NewGuid(), Amount = 5_000m, Currency = "USD" };
        var src = new Account { Id = Guid.NewGuid(), CachedBalance = 50_000m, Status = "Active" };
        var dst = new Account { Id = Guid.NewGuid(), Status = "Active" };

        var evaluation = riskService.EvaluatePayment(pReq, src, dst);

        Assert.Equal("Low", evaluation.RiskLevel);
        Assert.Equal("Approved", evaluation.Decision);
        Assert.Empty(evaluation.RuleHits);
        Assert.True(evaluation.Score < 25);
    }

    [Fact]
    public void EvaluatePayment_HighAmount_ReturnsFlaggedOrRejected()
    {
        var riskService = new RiskService();
        var pReq = new PaymentRequest { Id = Guid.NewGuid(), Amount = 150_000m, Currency = "USD" };
        var src = new Account { Id = Guid.NewGuid(), CachedBalance = 200_000m, Status = "Active" };
        var dst = new Account { Id = Guid.NewGuid(), Status = "Active" };

        var evaluation = riskService.EvaluatePayment(pReq, src, dst);

        Assert.Equal("Medium", evaluation.RiskLevel); // 40 points = Medium (> 25)
        Assert.Equal("Approved", evaluation.Decision);
        Assert.Contains(evaluation.RuleHits, r => r.Contains("High value transaction"));
    }

    [Fact]
    public void EvaluatePayment_FrozenAccount_RejectsTransaction()
    {
        var riskService = new RiskService();
        var pReq = new PaymentRequest { Id = Guid.NewGuid(), Amount = 1_000m, Currency = "USD" };
        var src = new Account { Id = Guid.NewGuid(), CachedBalance = 50_000m, Status = "Frozen" };
        var dst = new Account { Id = Guid.NewGuid(), Status = "Active" };

        var evaluation = riskService.EvaluatePayment(pReq, src, dst);

        Assert.Contains(evaluation.RuleHits, r => r.Contains("Frozen"));
        Assert.Equal("High", evaluation.RiskLevel);
        Assert.Equal("FlaggedForReview", evaluation.Decision);
    }

    [Fact]
    public void EvaluatePayment_DepletionRatioAndHighValue_CriticalRejection()
    {
        var riskService = new RiskService();
        var pReq = new PaymentRequest { Id = Guid.NewGuid(), Amount = 100_000m, Currency = "USD" };
        var src = new Account { Id = Guid.NewGuid(), CachedBalance = 105_000m, Status = "Suspended" };
        var dst = new Account { Id = Guid.NewGuid(), Status = "Active" };

        var evaluation = riskService.EvaluatePayment(pReq, src, dst);

        // 40 (high value) + 60 (suspended) + 20 (depletion > 90%) = 120 points -> Critical / Rejected
        Assert.Equal("Critical", evaluation.RiskLevel);
        Assert.Equal("Rejected", evaluation.Decision);
        Assert.Equal(3, evaluation.RuleHits.Count);
    }
}
