using System.Text.Json.Serialization;

namespace VeriSpend.Api.Models;

public class Tenant
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = default!;

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string ApiKey { get; set; } = default!;

    public string PlanType { get; set; } = default!;
    public decimal MaxSpendLimit { get; set; } = 2_000_000m;
    public string? PolicyNotes { get; set; }
    public string BaseCurrency { get; set; } = "USD";

    // Auto-approval defaults
    public bool AutoApprovalEnabled { get; set; } = false;
    public decimal AutoApprovalMaxAmount { get; set; } = 50m;
    public int AutoApprovalMaxRiskScore { get; set; } = 20;
    public bool AutoApprovalExcludeWeekends { get; set; } = true;
    public string? AutoApprovalExcludedCategories { get; set; } // JSON array
    public int AutoApprovalMinAgeHours { get; set; } = 24;

    // Category budgets (JSON: { "travel": 5000, "meals": 2000 })
    public string? CategoryBudgets { get; set; }

    // Auto-categorization rules (JSON array: [{"Pattern":"uber","Category":"Travel"},{"Pattern":"starbucks","Category":"Meals"}])
    public string? CategoryRules { get; set; }

    // Notification settings (Phase 2)
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool SlackNotificationsEnabled { get; set; } = false;

    /// <summary>Security: Never serialized in API responses (webhook credentials)</summary>
    [JsonIgnore]
    public string? SlackWebhookUrl { get; set; }

    public string? SlackChannel { get; set; }
    public string? SlackTeamId { get; set; } // For slash command identification

    /// <summary>Security: Never serialized in API responses (verification secret)</summary>
    [JsonIgnore]
    public string? SlackVerificationToken { get; set; } // For request verification

    /// <summary>Security: Never serialized in API responses (contains user PII mapping)</summary>
    [JsonIgnore]
    public string? SlackUserEmailMappings { get; set; } // JSON: {"U12345":"manager@company.com"}

    public string? ManagerEmail { get; set; } // For weekly digests, escalations
    public string? NoReplyEmail { get; set; } = "noreply@verispend.local";

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
