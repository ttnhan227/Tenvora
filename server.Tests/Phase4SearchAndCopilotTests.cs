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
using Tenvora.Dtos;
using Xunit;

namespace Tenvora.Tests;

public sealed class Phase4SearchAndCopilotTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(BusinessService Service, Guid TenantId, Guid OtherTenantId, Guid UserId)> Setup(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Phase 4 Tenant A",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            PlanType = "Business",
            Status = "Active"
        });

        db.Tenants.Add(new Tenant
        {
            Id = otherTenantId,
            CompanyName = "Phase 4 Tenant B (Competitor)",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD",
            PlanType = "Business",
            Status = "Active"
        });

        db.Users.Add(new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "admin@phase4test.com",
            PasswordHash = "hashed",
            Role = "TenantAdmin",
            FullName = "Admin User"
        });

        await db.SaveChangesAsync();
        var service = new BusinessService(db);
        return (service, tenantId, otherTenantId, userId);
    }

    [Fact]
    public async Task OmniSearch_ReturnsMatchingCustomersProductsSalesAndPurchases()
    {
        await using var db = Db();
        var (service, tenantId, _, _) = await Setup(db);

        // Seed Customer with an unpaid posted sale to yield debt
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Nguyen Van An",
            Phone = "0901234567",
            Email = "an.nguyen@example.com",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Customers.Add(customer);

        var customerSale = new Sale
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            SaleNumber = "INV-2026-DEBT-1",
            TotalAmount = 1_500_000m,
            Status = "Posted",
            IdempotencyKey = Guid.NewGuid().ToString("N"),
            RequestHash = "hash1",
            SoldAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Sales.Add(customerSale);

        // Seed Product
        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Arabica Premium Beans 1kg",
            Sku = "COF-ARA-01",
            DefaultPrice = 280_000m,
            CostPrice = 190_000m,
            StockQuantity = 45,
            Unit = "kg",
            TrackInventory = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Products.Add(product);

        // Seed Sale with payment
        var paidSale = new Sale
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SaleNumber = "INV-2026-0042",
            CustomerId = customer.Id,
            TotalAmount = 560_000m,
            Status = "Posted",
            IdempotencyKey = Guid.NewGuid().ToString("N"),
            RequestHash = "hash2",
            SoldAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Payments = new List<Payment>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CustomerId = customer.Id,
                    Amount = 560_000m,
                    Method = "Cash",
                    PaidAt = DateTime.UtcNow,
                    IdempotencyKey = Guid.NewGuid().ToString("N"),
                    RequestHash = "hash-pay-1"
                }
            }
        };
        db.Sales.Add(paidSale);

        // Seed Supplier & Purchase
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Da Lat Highlands Farm",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Suppliers.Add(supplier);

        var purchase = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseNumber = "PO-2026-901",
            SupplierId = supplier.Id,
            TotalAmount = 8_500_000m,
            Status = "Posted",
            IdempotencyKey = Guid.NewGuid().ToString("N"),
            RequestHash = "hash3",
            PurchasedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Payments = new List<PurchasePayment>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    SupplierId = supplier.Id,
                    Amount = 4_000_000m,
                    Method = "BankTransfer",
                    PaidAt = DateTime.UtcNow,
                    IdempotencyKey = Guid.NewGuid().ToString("N"),
                    RequestHash = "hash-ppay-1"
                }
            }
        };
        db.Purchases.Add(purchase);

        await db.SaveChangesAsync();

        // 1. Search by customer phone
        var phoneRes = await service.OmniSearchAsync(tenantId, "090123");
        Assert.True(phoneRes.Success);
        Assert.Single(phoneRes.Data!.Customers);
        Assert.Equal("Nguyen Van An", phoneRes.Data.Customers[0].Name);
        Assert.Equal(1_500_000m, phoneRes.Data.Customers[0].TotalDebt);

        // 2. Search by product SKU
        var skuRes = await service.OmniSearchAsync(tenantId, "COF-ARA");
        Assert.True(skuRes.Success);
        Assert.Single(skuRes.Data!.Products);
        Assert.Equal("Arabica Premium Beans 1kg", skuRes.Data.Products[0].Name);
        Assert.Equal(280_000m, skuRes.Data.Products[0].SellingPrice);
        Assert.Equal(45, skuRes.Data.Products[0].StockQuantity);

        // 3. Search by Sale Invoice Number
        var invRes = await service.OmniSearchAsync(tenantId, "INV-2026-0042");
        Assert.True(invRes.Success);
        Assert.Single(invRes.Data!.Sales);
        Assert.Equal("INV-2026-0042", invRes.Data.Sales[0].SaleNumber);
        Assert.Equal(560_000m, invRes.Data.Sales[0].PaidAmount);

        // 4. Search by Purchase Number
        var poRes = await service.OmniSearchAsync(tenantId, "PO-2026-901");
        Assert.True(poRes.Success);
        Assert.Single(poRes.Data!.Purchases);
        Assert.Equal("PO-2026-901", poRes.Data.Purchases[0].PurchaseNumber);
        Assert.Equal(4_000_000m, poRes.Data.Purchases[0].PaidAmount);
    }

    [Fact]
    public async Task OmniSearch_RespectsTenantIsolation_NeverLeakingOtherTenantRecords()
    {
        await using var db = Db();
        var (service, tenantId, otherTenantId, _) = await Setup(db);

        // Add secret data to other tenant
        db.Customers.Add(new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = otherTenantId,
            Name = "Secret VIP Buyer",
            Phone = "0999888777",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        db.Products.Add(new Product
        {
            Id = Guid.NewGuid(),
            TenantId = otherTenantId,
            Name = "Confidential Diamond Necklace",
            Sku = "DIAMOND-999",
            DefaultPrice = 100_000_000m,
            Unit = "piece",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        // Search from tenantId for otherTenantId's data
        var res = await service.OmniSearchAsync(tenantId, "Diamond");
        Assert.True(res.Success);
        Assert.Empty(res.Data!.Products);

        var custRes = await service.OmniSearchAsync(tenantId, "Secret VIP");
        Assert.True(custRes.Success);
        Assert.Empty(custRes.Data!.Customers);
    }

    [Fact]
    public async Task OmniSearch_EmptyQueryReturnsEmptyListsWithoutError()
    {
        await using var db = Db();
        var (service, tenantId, _, _) = await Setup(db);

        var resNull = await service.OmniSearchAsync(tenantId, null);
        Assert.True(resNull.Success);
        Assert.Empty(resNull.Data!.Customers);
        Assert.Empty(resNull.Data!.Products);
        Assert.Empty(resNull.Data!.Sales);
        Assert.Empty(resNull.Data!.Purchases);

        var resWhitespace = await service.OmniSearchAsync(tenantId, "   ");
        Assert.True(resWhitespace.Success);
        Assert.Empty(resWhitespace.Data!.Customers);
    }
}
