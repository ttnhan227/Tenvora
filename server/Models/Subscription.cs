namespace VeriSpend.Api.Models;

public class Subscription
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string PlanId { get; set; } = default!; // "starter", "professional", "enterprise"
    public string PlanName { get; set; } = default!;
    public decimal MonthlyPrice { get; set; }
    public decimal AnnualPrice { get; set; }
    public string BillingCycle { get; set; } = "monthly"; // "monthly" or "annual"
    public DateTime StartDate { get; set; }
    public DateTime? RenewalDate { get; set; }
    public DateTime? CancelledAt { get; set; }
    public bool Cancelled { get; set; }
    public bool IsActive { get; set; } = true;
    public string Status { get; set; } = "active"; // "active", "cancelled", "expired", "past_due"

    public Tenant? Tenant { get; set; }
}
