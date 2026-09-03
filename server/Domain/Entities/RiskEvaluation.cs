using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class RiskEvaluation
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid PaymentRequestId { get; set; }
    
    public int Score { get; set; }
    
    [MaxLength(30)]
    public string RiskLevel { get; set; } = "Low"; // Low, Medium, High, Critical
    
    [MaxLength(30)]
    public string Decision { get; set; } = "Approved"; // Approved, FlaggedForReview, Rejected
    
    public string RuleHitsJson { get; set; } = "[]";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public PaymentRequest? PaymentRequest { get; set; }
}
