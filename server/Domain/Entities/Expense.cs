using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class Expense
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AccountId { get; set; }
    public Guid TransactionId { get; set; }
    public Guid? ClientId { get; set; }
    public Guid? ProjectId { get; set; }

    [Required, MaxLength(200)]
    public string Merchant { get; set; } = default!;

    [Required, MaxLength(50)]
    public string Category { get; set; } = default!;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? Reference { get; set; }

    public decimal Amount { get; set; }

    [Required, StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "USD";

    public DateTime ExpenseDate { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = ExpenseStatuses.Posted;

    [Required, MaxLength(100)]
    public string IdempotencyKey { get; set; } = default!;

    [Required, MaxLength(128)]
    public string RequestHash { get; set; } = default!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? VoidedAt { get; set; }

    public Account? Account { get; set; }
    public Transaction? Transaction { get; set; }
    public Client? Client { get; set; }
    public Project? Project { get; set; }
}

public static class ExpenseStatuses
{
    public const string Posted = "Posted";
    public const string Void = "Void";
}

public static class ExpenseCategories
{
    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        "Software", "Equipment", "Workspace", "Transportation", "Marketing",
        "Professional Services", "Education", "Other"
    };
}
