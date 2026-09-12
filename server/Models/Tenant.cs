using System.Text.Json.Serialization;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Models;

public class Tenant
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = default!;

    /// <summary>Security: Never serialized in API responses</summary>
    [JsonIgnore]
    public string ApiKey { get; set; } = default!;

    public string PlanType { get; set; } = "Enterprise";
    public string BaseCurrency { get; set; } = "USD";
    public string Status { get; set; } = "Active"; // Active, Suspended
    public bool IsDemo { get; set; }
    public DateTime? DemoExpiresAt { get; set; }

    // Freelancer cash-flow planning configuration
    public decimal DefaultTaxSetAsideRate { get; set; } = 25.0m; // 25% default tax withholding
    public bool AutoTaxSetAsideEnabled { get; set; } = false;
    public string FilingStatus { get; set; } = "Single"; // Single, MarriedJoint, LLC_SoleProp
    public string? PersonalTaxIdLast4 { get; set; }
    public string? LinkedExternalBankName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<LedgerEntry> LedgerEntries { get; set; } = new List<LedgerEntry>();
    public ICollection<SettlementBatch> SettlementBatches { get; set; } = new List<SettlementBatch>();
    public ICollection<ReconciliationRun> ReconciliationRuns { get; set; } = new List<ReconciliationRun>();
}
