using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Domain.Entities;

public class Project
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ClientId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = default!;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required, MaxLength(30)]
    public string Status { get; set; } = ProjectStatuses.Active;

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? BudgetAmount { get; set; }

    [Required, StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "USD";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Client? Client { get; set; }
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}

public static class ProjectStatuses
{
    public const string Planned = "Planned";
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Archived = "Archived";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Planned, Active, Completed, Archived
    };
}
