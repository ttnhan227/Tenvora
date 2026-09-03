using System.Text.Json;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IRiskService
{
    RiskEvaluationResponse EvaluatePayment(PaymentRequest request, Account sourceAccount, Account destinationAccount);
}

public class RiskService : IRiskService
{
    public RiskEvaluationResponse EvaluatePayment(PaymentRequest request, Account sourceAccount, Account destinationAccount)
    {
        var score = 0;
        var ruleHits = new List<string>();

        // Rule 1: High Transaction Value Threshold (> $100,000)
        if (request.Amount >= 100_000m)
        {
            score += 40;
            ruleHits.Add("High value transaction exceeding $100,000 threshold");
        }
        else if (request.Amount >= 25_000m)
        {
            score += 15;
            ruleHits.Add("Medium-high value transaction exceeding $25,000");
        }

        // Rule 2: Account Status Check
        if (sourceAccount.Status != "Active")
        {
            score += 60;
            ruleHits.Add($"Source account is in '{sourceAccount.Status}' state");
        }

        // Rule 3: Balance Depletion Ratio (> 90% of available funds)
        if (sourceAccount.CachedBalance > 0 && (request.Amount / sourceAccount.CachedBalance) >= 0.9m)
        {
            score += 20;
            ruleHits.Add("Transaction exhausts >90% of available source balance");
        }

        var riskLevel = score switch
        {
            >= 75 => "Critical",
            >= 50 => "High",
            >= 25 => "Medium",
            _ => "Low"
        };

        var decision = riskLevel switch
        {
            "Critical" => "Rejected",
            "High" => "FlaggedForReview",
            _ => "Approved"
        };

        return new RiskEvaluationResponse(
            Guid.NewGuid(),
            request.Id,
            score,
            riskLevel,
            decision,
            ruleHits,
            DateTime.UtcNow
        );
    }
}
