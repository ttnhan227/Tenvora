using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class Phase1DashboardAndSupplierPaymentTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(BusinessService Service, Guid TenantId)> Setup(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Action-First Home Test Business",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            PlanType = "Business",
            Status = "Active"
        });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var service = new BusinessService(db);
        return (service, tenantId);
    }

    [Fact]
    public async Task AttentionFeed_DetectsStockouts_LowStock_AndPendingDrafts()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        // 1. Create out of stock product
        var p1 = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Ca Phe Chon",
            Unit = "kg",
            DefaultPrice = 250000m,
            CostPrice = 180000m,
            StockQuantity = 0,
            MinStockLevel = 5,
            TrackInventory = true,
            IsActive = true
        };

        // 2. Create low stock product
        var p2 = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Tra O Long",
            Unit = "hop",
            DefaultPrice = 120000m,
            CostPrice = 80000m,
            StockQuantity = 2,
            MinStockLevel = 10,
            TrackInventory = true,
            IsActive = true
        };

        // 3. Create pending AI action
        var action = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = Guid.NewGuid(),
            Intent = "sale",
            Status = AiActionStatuses.PendingConfirmation,
            ExpiresAt = DateTime.UtcNow.AddHours(12),
            SourceText = "ban 2kg ca phe",
            PayloadJson = "{}",
            IdempotencyKey = Guid.NewGuid().ToString("N")
        };

        db.Products.AddRange(p1, p2);
        db.AiActions.Add(action);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var result = await service.GetDashboardAttentionItemsAsync(tenantId);
        Assert.True(result.Success);
        var items = result.Data!;

        Assert.Contains(items, i => i.Type == "out_of_stock" && i.Severity == "urgent" && i.Count == 1);
        Assert.Contains(items, i => i.Type == "low_stock" && i.Severity == "warn" && i.Count == 1);
        Assert.Contains(items, i => i.Type == "pending_ai_actions" && i.Count == 1);
    }

    [Fact]
    public async Task PurchaseDueDate_DefaultsFromSupplierPaymentTerms()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var supplierResult = await service.CreateSupplierAsync(tenantId, new CreateSupplierRequest(
            Name: "Nha Cung Cap Tay Nguyen",
            Phone: "0901234567",
            Email: null,
            Address: "Gia Lai",
            Notes: null,
            PaymentTermsDays: 15
        ));
        Assert.True(supplierResult.Success);
        var supplier = supplierResult.Data!;
        Assert.Equal(15, supplier.PaymentTermsDays);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Hat Ca Phe Robusta",
            Unit = "kg",
            DefaultPrice = 150000m,
            CostPrice = 90000m,
            TrackInventory = true,
            IsActive = true
        };
        db.Products.Add(product);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var purchaseDate = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc);
        var purchaseResult = await service.CreatePurchaseAsync(tenantId, "idemp-pur-terms", new CreatePurchaseRequest(
            SupplierId: supplier.Id,
            Items: new List<CreatePurchaseItemRequest>
            {
                new("Hat Ca Phe Robusta", "kg", 100, 90000m, product.Id)
            },
            PaymentAmount: 0m,
            PurchasedAt: purchaseDate
        ));

        Assert.True(purchaseResult.Success);
        var purchase = purchaseResult.Data!;
        Assert.NotNull(purchase.DueDate);
        Assert.Equal(purchaseDate.AddDays(15), purchase.DueDate.Value);
    }

    [Fact]
    public async Task SupplierAccountPayment_CascadesFIFO_AcrossUnpaidPurchases()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var sResult = await service.CreateSupplierAsync(tenantId, new CreateSupplierRequest("Cong Ty Bao Bi"));
        var supplierId = sResult.Data!.Id;

        var pur1 = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierId,
            PurchaseNumber = "PUR-20261001-0001",
            TotalAmount = 500000m,
            Currency = "VND",
            Status = "Posted",
            IdempotencyKey = "pur-1-key",
            RequestHash = "pur-1-hash",
            PurchasedAt = DateTime.UtcNow.AddDays(-10),
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        };
        var pur2 = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierId,
            PurchaseNumber = "PUR-20261005-0002",
            TotalAmount = 300000m,
            Currency = "VND",
            Status = "Posted",
            IdempotencyKey = "pur-2-key",
            RequestHash = "pur-2-hash",
            PurchasedAt = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };

        db.Purchases.AddRange(pur1, pur2);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Pay 600,000 VND (should fully settle pur1: 500k, and partially settle pur2: 100k)
        var payResult = await service.RecordSupplierAccountPaymentAsync(tenantId, supplierId, "idemp-supp-pay-1",
            new RecordSupplierAccountPaymentRequest(Amount: 600000m, Method: "Bank transfer"));

        Assert.True(payResult.Success);
        var data = payResult.Data!;
        Assert.Equal(600000m, data.TotalAllocated);
        Assert.Equal(200000m, data.RemainingBalance); // 800k total - 600k paid = 200k remaining
        Assert.Equal(2, data.AffectedPurchases.Count);

        var p1Updated = data.AffectedPurchases.First(p => p.Id == pur1.Id);
        Assert.Equal("Paid", p1Updated.PaymentStatus);
        Assert.Equal(0m, p1Updated.OutstandingBalance);

        var p2Updated = data.AffectedPurchases.First(p => p.Id == pur2.Id);
        Assert.Equal("Partially paid", p2Updated.PaymentStatus);
        Assert.Equal(200000m, p2Updated.OutstandingBalance);

        // Retransmission idempotency test
        var replay = await service.RecordSupplierAccountPaymentAsync(tenantId, supplierId, "idemp-supp-pay-1",
            new RecordSupplierAccountPaymentRequest(Amount: 600000m, Method: "Bank transfer"));
        Assert.True(replay.Success);
        Assert.Equal(600000m, replay.Data!.TotalAllocated);
        Assert.Equal(200000m, replay.Data!.RemainingBalance);
    }

    [Fact]
    public async Task SupplierAccountPayment_CannotOverpayBalance()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var sResult = await service.CreateSupplierAsync(tenantId, new CreateSupplierRequest("Cong Ty Giay"));
        var supplierId = sResult.Data!.Id;

        var pur = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierId,
            PurchaseNumber = "PUR-20261010-0001",
            TotalAmount = 100000m,
            Currency = "VND",
            Status = "Posted",
            IdempotencyKey = "pur-overpay-key",
            RequestHash = "pur-overpay-hash"
        };
        db.Purchases.Add(pur);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var overpay = await service.RecordSupplierAccountPaymentAsync(tenantId, supplierId, "idemp-overpay",
            new RecordSupplierAccountPaymentRequest(Amount: 150000m));
        Assert.False(overpay.Success);
        Assert.Contains("cannot exceed", overpay.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ProductUnits_ReturnsMergedTenantAndPresets()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        db.Products.Add(new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Thiet bi dien tu",
            Unit = "custom_module",
            DefaultPrice = 1000m,
            IsActive = true
        });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var units = await service.GetDistinctProductUnitsAsync(tenantId);
        Assert.True(units.Success);
        Assert.Contains("custom_module", units.Data!);
        Assert.Contains("kg", units.Data!);
        Assert.Contains("box", units.Data!);
        Assert.Contains("cái", units.Data!);
    }
}
