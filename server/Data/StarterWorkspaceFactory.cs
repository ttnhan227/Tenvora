using System.Text.Json;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Data;

public static class StarterWorkspaceFactory
{
    public static void Populate(Tenant tenant, User owner, DateTime now)
    {
        tenant.PlanType = "Professional";
        tenant.MaxSpendLimit = 25_000m;
        tenant.PolicyNotes = "Receipts are required above $75. Travel above $1,000 and client meals above $150 require manager review.";
        tenant.AutoApprovalEnabled = true;
        tenant.AutoApprovalMaxAmount = 100m;
        tenant.AutoApprovalMaxRiskScore = 25;
        tenant.AutoApprovalExcludeWeekends = true;
        tenant.AutoApprovalMinAgeHours = 12;
        tenant.AutoApprovalExcludedCategories = "[\"Entertainment\",\"Equipment\"]";
        tenant.CategoryBudgets = JsonSerializer.Serialize(new Dictionary<string, decimal>
        {
            ["Travel"] = 8_000m,
            ["Meals"] = 2_500m,
            ["Software"] = 4_000m,
            ["Office Supplies"] = 1_500m,
            ["Equipment"] = 6_000m
        });
        tenant.CategoryRules = JsonSerializer.Serialize(new[]
        {
            new { Pattern = "uber", Category = "Ground Transport" },
            new { Pattern = "delta", Category = "Travel" },
            new { Pattern = "marriott", Category = "Lodging" },
            new { Pattern = "figma", Category = "Software" }
        });

        tenant.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            Tenant = tenant,
            PlanId = "professional",
            PlanName = "Professional",
            MonthlyPrice = 79m,
            AnnualPrice = 869m,
            BillingCycle = "monthly",
            StartDate = now,
            RenewalDate = now.AddMonths(1),
            IsActive = true,
            Status = "active"
        });

        var suffix = tenant.Id.ToString("N")[..8];
        var manager = TeamMember($"finance.manager+{suffix}@demo.verispend.app", "Manager", tenant);
        var employee = TeamMember($"alex.employee+{suffix}@demo.verispend.app", "Member", tenant);
        tenant.Users.Add(manager);
        tenant.Users.Add(employee);

        AddExpense(tenant, employee, "Delta Air Lines", "Travel", 1_486.40m, "Pending", now.AddDays(-2), true,
            "Amount exceeds the travel review threshold.", "Last-minute flight for the customer renewal workshop.");
        AddExpense(tenant, employee, "The Capital Grille", "Meals", 286.20m, "Pending", now.AddDays(-1), true,
            "High meal spend and attendee evidence is missing.", "Client dinner after the quarterly business review.");
        AddExpense(tenant, manager, "Apple Store", "Equipment", 1_299m, "Pending", now.AddDays(-3), true,
            "Restricted equipment category requires asset approval.", "iPad for field review and receipt capture testing.");
        AddExpense(tenant, employee, "Uber", "Ground Transport", 48.75m, "Approved", now.AddDays(-5), false, null,
            "Airport transfer for customer workshop.", true);
        AddExpense(tenant, employee, "Figma", "Software", 180m, "Approved", now.AddDays(-9), false, null,
            "Quarterly design collaboration subscription.");
        AddExpense(tenant, manager, "Marriott", "Lodging", 642.15m, "Approved", now.AddDays(-12), false, null,
            "Two-night stay for the annual planning offsite.");
        AddExpense(tenant, employee, "Staples", "Office Supplies", 73.14m, "Approved", now.AddDays(-15), false, null,
            "Workshop notebooks and whiteboard supplies.", true);
        AddExpense(tenant, employee, "Westin", "Lodging", 824.20m, "Rejected", now.AddDays(-7), true,
            "Stay extension was outside the approved trip dates.", "Unplanned extra hotel night after the workshop.");
        AddExpense(tenant, manager, "Microsoft", "Software", 267.50m, "Approved", now.AddDays(-18), false, null,
            "Power BI licenses for finance reporting.");
        AddExpense(tenant, employee, "Uber", "Ground Transport", 48.75m, "Pending", now.AddDays(-4), true,
            "Possible duplicate: same merchant and amount within 24 hours.", "Airport transfer submitted from card feed.");
    }

    private static User TeamMember(string email, string role, Tenant tenant) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = Services.PasswordHasher.Hash(Guid.NewGuid().ToString("N")),
        Role = role,
        IsActive = true,
        Tenant = tenant,
        PreferredCurrency = "USD"
    };

    private static void AddExpense(Tenant tenant, User user, string merchant, string category, decimal amount,
        string status, DateTime date, bool flagged, string? flagReason, string description, bool autoApproved = false)
    {
        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            Tenant = tenant,
            User = user,
            Merchant = merchant,
            Category = category,
            Amount = amount,
            BaseAmount = amount,
            Currency = "USD",
            Status = status,
            Date = date,
            Description = description,
            Flagged = flagged,
            FlagReason = flagReason,
            CreatedAt = date.AddHours(2),
            UpdatedAt = status == "Pending" ? null : date.AddDays(1)
        };

        expense.Receipts.Add(new Receipt
        {
            Id = Guid.NewGuid(),
            Expense = expense,
            FileUrl = "/placeholder.svg",
            OcrRawData = JsonSerializer.Serialize(new { merchant, total = amount, currency = "USD", expenseDate = date.ToString("yyyy-MM-dd"), category })
        });
        expense.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Expense = expense,
            Action = "Created",
            PerformedBy = user.Email,
            Timestamp = expense.CreatedAt,
            NewValue = JsonSerializer.Serialize(new { merchant, amount, category, status = "Draft" }),
            Notes = "Expense captured from the starter workspace scenario."
        });
        expense.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Expense = expense,
            Action = autoApproved ? "AutoApproved" : status == "Rejected" ? "Rejected" : status == "Approved" ? "Approved" : "Submitted",
            PerformedBy = autoApproved ? "VeriSpend policy engine" : status == "Pending" ? user.Email : "finance.manager@demo.verispend.app",
            Timestamp = expense.UpdatedAt ?? expense.CreatedAt.AddHours(4),
            OldValue = JsonSerializer.Serialize(new { status = "Draft" }),
            NewValue = JsonSerializer.Serialize(new { status }),
            Notes = autoApproved ? "Automatically approved within configured amount and risk guardrails." : flagReason ?? "Receipt and policy evidence reviewed."
        });
        tenant.Expenses.Add(expense);
    }
}
