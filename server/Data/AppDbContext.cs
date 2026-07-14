using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Receipt> Receipts => Set<Receipt>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ExpenseReviewFeedback> ExpenseReviewFeedback => Set<ExpenseReviewFeedback>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CompanyName).IsRequired();
            entity.Property(e => e.ApiKey).IsRequired();
            entity.Property(e => e.PlanType).IsRequired();
            entity.Property(e => e.BaseCurrency).HasDefaultValue("USD").HasMaxLength(10).IsRequired();
            entity.HasMany(e => e.Users)
                .WithOne(u => u.Tenant!)
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Expenses)
                .WithOne(x => x.Tenant!)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ExpenseCardSuspended).HasDefaultValue(false);
            entity.Property(e => e.ExpenseCardSuspensionReason).HasMaxLength(500);
            entity.Property(e => e.PreferredCurrency).HasDefaultValue("USD").HasMaxLength(10).IsRequired();
            entity.HasIndex(e => e.InviteToken).IsUnique();
            entity.HasMany(e => e.Expenses)
                .WithOne(x => x.User!)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseAmount).HasColumnType("numeric");
            entity.Property(e => e.Currency).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Merchant).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Flagged).HasDefaultValue(false);
            entity.Property(e => e.FlagReason).HasMaxLength(500);
            entity.HasMany(e => e.Receipts)
                .WithOne(r => r.Expense!)
                .HasForeignKey(r => r.ExpenseId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.AuditLogs)
                .WithOne(a => a.Expense!)
                .HasForeignKey(a => a.ExpenseId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.TenantId, e.IsDeleted, e.CreatedAt });
            entity.HasIndex(e => e.UserId);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Receipt>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileUrl).IsRequired();
        });

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
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).IsRequired();
            entity.Property(e => e.Timestamp).IsRequired();
            entity.Property(e => e.PerformedBy).IsRequired();
            entity.Property(e => e.OldValue).HasColumnType("jsonb");
            entity.Property(e => e.NewValue).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.ExpenseId, e.Timestamp });
            entity.HasIndex(e => e.PerformedBy);
        });

        modelBuilder.Entity<ExpenseReviewFeedback>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SubmittedBy).IsRequired();
            entity.Property(e => e.OriginalRiskLevel).HasMaxLength(25).IsRequired();
            entity.Property(e => e.CorrectedRiskLevel).HasMaxLength(25).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.HasOne(e => e.Expense)
                .WithMany()
                .HasForeignKey(e => e.ExpenseId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ExpenseId);
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PlanId).IsRequired();
            entity.Property(e => e.PlanName).IsRequired();
            entity.Property(e => e.BillingCycle).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.HasOne(e => e.Tenant)
                .WithMany(t => t.Subscriptions)
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
