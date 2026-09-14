using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<InvoicePayment> InvoicePayments => Set<InvoicePayment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<PaymentRequest> PaymentRequests => Set<PaymentRequest>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<SettlementBatch> SettlementBatches => Set<SettlementBatch>();
    public DbSet<SettlementEntry> SettlementEntries => Set<SettlementEntry>();
    public DbSet<ReconciliationRun> ReconciliationRuns => Set<ReconciliationRun>();
    public DbSet<ReconciliationDiscrepancy> ReconciliationDiscrepancies => Set<ReconciliationDiscrepancy>();
    public DbSet<RiskEvaluation> RiskEvaluations => Set<RiskEvaluation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant Configuration
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CompanyName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ApiKey).HasMaxLength(128).IsRequired();
            entity.Property(e => e.PlanType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.BaseCurrency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Active").IsRequired();

            entity.HasMany(e => e.Users)
                .WithOne(u => u.Tenant!)
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Customers)
                .WithOne()
                .HasForeignKey(c => c.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Clients)
                .WithOne()
                .HasForeignKey(c => c.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Projects)
                .WithOne()
                .HasForeignKey(p => p.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Invoices)
                .WithOne()
                .HasForeignKey(i => i.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.InvoicePayments)
                .WithOne()
                .HasForeignKey(p => p.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Expenses)
                .WithOne()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Accounts)
                .WithOne()
                .HasForeignKey(a => a.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Transactions)
                .WithOne()
                .HasForeignKey(t => t.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.LedgerEntries)
                .WithOne()
                .HasForeignKey(l => l.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ApiKey).IsUnique();
        });

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PreferredCurrency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.Email }).IsUnique();
            entity.HasIndex(e => e.InviteToken).IsUnique();
        });

        // RefreshToken Configuration
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired();
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.Revoked).HasDefaultValue(false);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        // Customer Configuration
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.KycStatus).HasMaxLength(30).HasDefaultValue("Verified").IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Active").IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.Email });
            entity.HasIndex(e => new { e.TenantId, e.Status });

            entity.HasMany(e => e.Accounts)
                .WithOne(a => a.Customer)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Account Configuration
        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AccountNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.AccountType).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.CachedBalance).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Active").IsRequired();

            // Optimistic concurrency token
            entity.Property(e => e.RowVersion).IsRowVersion();

            entity.HasIndex(e => new { e.TenantId, e.AccountNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.CustomerId });
            entity.HasIndex(e => new { e.TenantId, e.Status });
        });

        // PaymentRequest Configuration
        modelBuilder.Entity<PaymentRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Purpose).HasMaxLength(500);
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("Initiated").IsRequired();
            entity.Property(e => e.RejectionReason).HasMaxLength(500);

            entity.HasOne(e => e.SourceAccount)
                .WithMany()
                .HasForeignKey(e => e.SourceAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DestinationAccount)
                .WithMany()
                .HasForeignKey(e => e.DestinationAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey });
            entity.HasIndex(e => new { e.TenantId, e.Status, e.CreatedAt });
        });

        // Transaction Configuration
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReferenceNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.TransactionType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.RelatedEntityType).HasMaxLength(30);

            entity.HasOne(e => e.PaymentRequest)
                .WithMany(p => p.Transactions)
                .HasForeignKey(e => e.PaymentRequestId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.OriginalTransaction)
                .WithMany(t => t.ReversalTransactions)
                .HasForeignKey(e => e.OriginalTransactionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.LedgerEntries)
                .WithOne(l => l.Transaction!)
                .HasForeignKey(l => l.TransactionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.TenantId, e.ReferenceNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.TenantId, e.OriginalTransactionId });
            entity.HasIndex(e => new { e.TenantId, e.RelatedEntityType, e.RelatedEntityId });
            entity.ToTable(t => t.HasCheckConstraint("CK_Transactions_Amount_Positive", "\"Amount\" > 0"));
        });

        // LedgerEntry Configuration (Immutable Double-Entry lines)
        modelBuilder.Entity<LedgerEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntryType).HasMaxLength(10).IsRequired();
            entity.Property(e => e.DebitAmount).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.CreditAmount).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.PostedAt).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(e => e.Account)
                .WithMany(a => a.LedgerEntries)
                .HasForeignKey(e => e.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.TenantId, e.TransactionId });
            entity.HasIndex(e => new { e.TenantId, e.AccountId, e.PostedAt });
            entity.ToTable(t => t.HasCheckConstraint("CK_LedgerEntries_OneSide", "(\"DebitAmount\" > 0 AND \"CreditAmount\" = 0) OR (\"CreditAmount\" > 0 AND \"DebitAmount\" = 0)"));
        });

        // IdempotencyRecord Configuration
        modelBuilder.Entity<IdempotencyRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).IsRequired();
            entity.Property(e => e.ResponseBody).HasColumnType("text");

            entity.HasIndex(e => new { e.TenantId, e.Key }).IsUnique();
            entity.HasIndex(e => e.ExpiresAt);
        });

        // SettlementBatch Configuration
        modelBuilder.Entity<SettlementBatch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BatchNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.TotalDebitAmount).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.TotalCreditAmount).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Open").IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.BatchNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.Status });

            entity.HasMany(e => e.Entries)
                .WithOne(se => se.SettlementBatch!)
                .HasForeignKey(se => se.SettlementBatchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SettlementEntry Configuration
        modelBuilder.Entity<SettlementEntry>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Transaction)
                .WithMany()
                .HasForeignKey(e => e.TransactionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.TenantId, e.SettlementBatchId });
            entity.HasIndex(e => new { e.TenantId, e.TransactionId });
        });

        // ReconciliationRun Configuration
        modelBuilder.Entity<ReconciliationRun>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RunNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.RunNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.StartedAt });

            entity.HasMany(e => e.Discrepancies)
                .WithOne(d => d.ReconciliationRun!)
                .HasForeignKey(d => d.ReconciliationRunId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ReconciliationDiscrepancy Configuration
        modelBuilder.Entity<ReconciliationDiscrepancy>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ExpectedBalance).HasPrecision(18, 4);
            entity.Property(e => e.CalculatedBalance).HasPrecision(18, 4);
            entity.Property(e => e.DiscrepancyAmount).HasPrecision(18, 4);
            entity.Property(e => e.Reason).HasMaxLength(500).IsRequired();

            entity.HasOne(e => e.Account)
                .WithMany()
                .HasForeignKey(e => e.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.TenantId, e.ReconciliationRunId });
            entity.HasIndex(e => new { e.TenantId, e.AccountId });
        });

        // RiskEvaluation Configuration
        modelBuilder.Entity<RiskEvaluation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RiskLevel).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Decision).HasMaxLength(30).IsRequired();
            entity.Property(e => e.RuleHitsJson).HasColumnType("jsonb").IsRequired();

            entity.HasOne(e => e.PaymentRequest)
                .WithMany()
                .HasForeignKey(e => e.PaymentRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.TenantId, e.PaymentRequestId });
        });

        // AuditLog Configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.PerformedBy).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Timestamp).IsRequired();
            entity.Property(e => e.OldValue).HasColumnType("jsonb");
            entity.Property(e => e.NewValue).HasColumnType("jsonb");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IpAddress).HasMaxLength(50);

            entity.HasIndex(e => new { e.TenantId, e.EntityType, e.EntityId });
            entity.HasIndex(e => new { e.TenantId, e.Timestamp });
            entity.HasIndex(e => e.PerformedBy);
        });

        // Client Configuration (Freelancer Client CRM)
        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ContactEmail).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Company).HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();
            entity.Property(e => e.DefaultPaymentTermsDays).HasDefaultValue(14);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 4);
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Active").IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.Name });
            entity.HasIndex(e => new { e.TenantId, e.ContactEmail });
            entity.HasIndex(e => new { e.TenantId, e.Status });

            entity.HasMany(e => e.Invoices)
                .WithOne(i => i.Client)
                .HasForeignKey(i => i.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Projects)
                .WithOne(p => p.Client)
                .HasForeignKey(p => p.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Expenses)
                .WithOne(x => x.Client)
                .HasForeignKey(x => x.ClientId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue(ProjectStatuses.Active).IsRequired();
            entity.Property(e => e.BudgetAmount).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.ClientId });
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.Name });
            entity.HasMany(e => e.Invoices)
                .WithOne(i => i.Project)
                .HasForeignKey(i => i.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(e => e.Expenses)
                .WithOne(x => x.Project)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Projects_Budget_NonNegative", "\"BudgetAmount\" IS NULL OR \"BudgetAmount\" >= 0");
                t.HasCheckConstraint("CK_Projects_Status", "\"Status\" IN ('Planned','Active','Completed','Archived')");
            });
        });

        // Invoice Configuration
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InvoiceNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();
            entity.Property(e => e.Subtotal).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.TaxRate).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.TaxAmount).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.AmountPaid).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("Draft").IsRequired();
            entity.Property(e => e.PaymentTerms).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasIndex(e => new { e.TenantId, e.InvoiceNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.ClientId });
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.HasIndex(e => new { e.TenantId, e.DueDate });

            entity.HasOne(e => e.DestinationAccount)
                .WithMany()
                .HasForeignKey(e => e.DestinationAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.PaymentTransaction)
                .WithMany()
                .HasForeignKey(e => e.PaymentTransactionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.Items)
                .WithOne(item => item.Invoice!)
                .HasForeignKey(item => item.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Payments)
                .WithOne(p => p.Invoice!)
                .HasForeignKey(p => p.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Invoices_Amounts", "\"Subtotal\" >= 0 AND \"TaxAmount\" >= 0 AND (\"TotalAmount\" > 0 OR (\"Status\" = 'Cancelled' AND \"TotalAmount\" = 0)) AND \"AmountPaid\" >= 0 AND \"AmountPaid\" <= \"TotalAmount\"");
                t.HasCheckConstraint("CK_Invoices_Status", "\"Status\" IN ('Draft','Sent','Viewed','PartiallyPaid','Paid','Overdue','Cancelled')");
                t.HasCheckConstraint("CK_Invoices_Dates", "\"DueDate\" >= \"IssueDate\"");
            });
        });

        // InvoiceItem Configuration
        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).HasMaxLength(300).IsRequired();
            entity.Property(e => e.Quantity).HasPrecision(18, 4).HasDefaultValue(1m);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 4).IsRequired();

            entity.HasIndex(e => e.InvoiceId);
        });

        modelBuilder.Entity<InvoicePayment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Reference).HasMaxLength(200);
            entity.HasOne(e => e.Transaction)
                .WithMany()
                .HasForeignKey(e => e.TransactionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.InvoiceId, e.PaidAt });
            entity.ToTable(t => t.HasCheckConstraint("CK_InvoicePayments_Amount_Positive", "\"Amount\" > 0"));
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Merchant).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Reference).HasMaxLength(200);
            entity.Property(e => e.Amount).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue(ExpenseStatuses.Posted).IsRequired();
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.HasOne(e => e.Account).WithMany().HasForeignKey(e => e.AccountId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Transaction).WithMany().HasForeignKey(e => e.TransactionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.ExpenseDate });
            entity.HasIndex(e => new { e.TenantId, e.Category });
            entity.HasIndex(e => new { e.TenantId, e.ProjectId });
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Expenses_Amount_Positive", "\"Amount\" > 0");
                t.HasCheckConstraint("CK_Expenses_Status", "\"Status\" IN ('Posted','Void')");
                t.HasCheckConstraint("CK_Expenses_Category", "\"Category\" IN ('Software','Equipment','Workspace','Transportation','Marketing','Professional Services','Education','Other')");
            });
        });
    }
}
