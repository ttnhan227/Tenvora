using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<Payment> BusinessPayments => Set<Payment>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();
    public DbSet<PurchasePayment> PurchasePayments => Set<PurchasePayment>();
    public DbSet<BusinessExpense> BusinessExpenses => Set<BusinessExpense>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CompanyName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ApiKey).HasMaxLength(128).IsRequired();
            entity.Property(e => e.PlanType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.BaseCurrency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Active").IsRequired();
            entity.HasMany(e => e.Users).WithOne(u => u.Tenant).HasForeignKey(u => u.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Customers).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Products).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Sales).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Payments).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Suppliers).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Purchases).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.PurchasePayments).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.BusinessExpenses).WithOne().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.ApiKey).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.GoogleSub).HasMaxLength(255);
            entity.Property(e => e.Role).HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PreferredCurrency).HasMaxLength(3).HasDefaultValue("USD").IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Email }).IsUnique();
            entity.HasIndex(e => e.InviteToken).IsUnique();
            entity.HasIndex(e => e.GoogleSub).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired();
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.Revoked).HasDefaultValue(false);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.PerformedBy).HasMaxLength(200).IsRequired();
            entity.Property(e => e.OldValue).HasColumnType("jsonb");
            entity.Property(e => e.NewValue).HasColumnType("jsonb");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.HasIndex(e => new { e.TenantId, e.EntityType, e.EntityId });
            entity.HasIndex(e => new { e.TenantId, e.Timestamp });
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasAlternateKey(e => new { e.TenantId, e.Id });
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(200);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Active").IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Email });
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.ToTable(t => t.HasCheckConstraint("CK_Customers_Status", "\"Status\" IN ('Active','Archived')"));
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasAlternateKey(e => new { e.TenantId, e.Id });
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Sku).HasMaxLength(100);
            entity.Property(e => e.Unit).HasMaxLength(40).IsRequired();
            entity.Property(e => e.DefaultPrice).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.HasIndex(e => new { e.TenantId, e.Name });
            entity.HasIndex(e => new { e.TenantId, e.Sku }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.IsActive });
            entity.ToTable(t => t.HasCheckConstraint("CK_Products_DefaultPrice_NonNegative", "\"DefaultPrice\" >= 0"));
        });

        modelBuilder.Entity<Sale>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasAlternateKey(e => new { e.TenantId, e.Id });
            entity.HasAlternateKey(e => new { e.TenantId, e.Id, e.CustomerId });
            entity.Property(e => e.SaleNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.HasOne(e => e.Customer).WithMany(c => c.Sales).HasPrincipalKey(c => new { c.TenantId, c.Id })
                .HasForeignKey(e => new { e.TenantId, e.CustomerId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.SaleNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.CustomerId, e.SoldAt });
            entity.HasIndex(e => new { e.TenantId, e.SoldAt });
            entity.ToTable(t => { t.HasCheckConstraint("CK_Sales_Total_Positive", "\"TotalAmount\" > 0"); t.HasCheckConstraint("CK_Sales_Status", "\"Status\" IN ('Posted','Voided')"); });
        });

        modelBuilder.Entity<SaleItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Unit).HasMaxLength(40).IsRequired();
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.LineTotal).HasPrecision(18, 4);
            entity.HasOne(e => e.Sale).WithMany(s => s.Items).HasPrincipalKey(s => new { s.TenantId, s.Id })
                .HasForeignKey(e => new { e.TenantId, e.SaleId }).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Product).WithMany(p => p.SaleItems).HasPrincipalKey(p => new { p.TenantId, p.Id })
                .HasForeignKey(e => new { e.TenantId, e.ProductId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.SaleId });
            entity.HasIndex(e => new { e.TenantId, e.ProductId });
            entity.ToTable(t => t.HasCheckConstraint("CK_SaleItems_PositiveValues", "\"Quantity\" > 0 AND \"UnitPrice\" >= 0 AND \"LineTotal\" >= 0"));
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Method).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Reference).HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.HasOne(e => e.Sale).WithMany(s => s.Payments).HasPrincipalKey(s => new { s.TenantId, s.Id, s.CustomerId })
                .HasForeignKey(e => new { e.TenantId, e.SaleId, e.CustomerId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Customer).WithMany(c => c.Payments).HasPrincipalKey(c => new { c.TenantId, c.Id })
                .HasForeignKey(e => new { e.TenantId, e.CustomerId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.CustomerId, e.PaidAt });
            entity.HasIndex(e => new { e.TenantId, e.SaleId, e.PaidAt });
            entity.ToTable(t => t.HasCheckConstraint("CK_BusinessPayments_Amount_Positive", "\"Amount\" > 0"));
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasAlternateKey(e => new { e.TenantId, e.Id });
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Name });
            entity.HasIndex(e => new { e.TenantId, e.Status });
            entity.ToTable(t => t.HasCheckConstraint("CK_Suppliers_Status", "\"Status\" IN ('Active','Archived')"));
        });

        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasAlternateKey(e => new { e.TenantId, e.Id });
            entity.HasAlternateKey(e => new { e.TenantId, e.Id, e.SupplierId });
            entity.Property(e => e.PurchaseNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.HasOne(e => e.Supplier).WithMany(s => s.Purchases).HasPrincipalKey(s => new { s.TenantId, s.Id })
                .HasForeignKey(e => new { e.TenantId, e.SupplierId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.PurchaseNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.SupplierId, e.PurchasedAt });
            entity.ToTable(t => { t.HasCheckConstraint("CK_Purchases_Total_Positive", "\"TotalAmount\" > 0"); t.HasCheckConstraint("CK_Purchases_Status", "\"Status\" IN ('Posted','Voided')"); });
        });

        modelBuilder.Entity<PurchaseItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Unit).HasMaxLength(40).IsRequired();
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitCost).HasPrecision(18, 4);
            entity.Property(e => e.LineTotal).HasPrecision(18, 4);
            entity.HasOne(e => e.Purchase).WithMany(p => p.Items).HasPrincipalKey(p => new { p.TenantId, p.Id })
                .HasForeignKey(e => new { e.TenantId, e.PurchaseId }).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Product).WithMany(p => p.PurchaseItems).HasPrincipalKey(p => new { p.TenantId, p.Id })
                .HasForeignKey(e => new { e.TenantId, e.ProductId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.PurchaseId });
            entity.ToTable(t => t.HasCheckConstraint("CK_PurchaseItems_PositiveValues", "\"Quantity\" > 0 AND \"UnitCost\" >= 0 AND \"LineTotal\" >= 0"));
        });

        modelBuilder.Entity<PurchasePayment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Method).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Reference).HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.HasOne(e => e.Purchase).WithMany(p => p.Payments).HasPrincipalKey(p => new { p.TenantId, p.Id, p.SupplierId })
                .HasForeignKey(e => new { e.TenantId, e.PurchaseId, e.SupplierId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Supplier).WithMany(s => s.Payments).HasPrincipalKey(s => new { s.TenantId, s.Id })
                .HasForeignKey(e => new { e.TenantId, e.SupplierId }).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.PurchaseId, e.PaidAt });
            entity.ToTable(t => t.HasCheckConstraint("CK_PurchasePayments_Amount_Positive", "\"Amount\" > 0"));
        });

        modelBuilder.Entity<BusinessExpense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(3).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RequestHash).HasMaxLength(128).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.ExpenseDate });
            entity.HasIndex(e => new { e.TenantId, e.Category });
            entity.ToTable(t => t.HasCheckConstraint("CK_BusinessExpenses_Amount_Positive", "\"Amount\" > 0"));
        });
    }
}
