using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Tenvora.Api.Controllers;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class EngineeringAuditRegressionTests
{
    private sealed class DummyHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private static AppDbContext Db(IHttpContextAccessor? http = null) => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .AddInterceptors(new EntityValidationInterceptor(), new AuditLogSaveChangesInterceptor(http ?? new HttpContextAccessor()))
        .Options);

    private static async Task<(BusinessService Service, Guid TenantId)> SetupBusiness(AppDbContext db, string currency = "VND")
    {
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Audit Test Business",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = currency,
            PlanType = "Business",
            Status = "Active"
        });
        await db.SaveChangesAsync();
        return (new BusinessService(db), tenantId);
    }

    [Fact]
    public async Task Finding1_CustomerAccountPayment_ReplayWithSameIdempotencyKey_IsIdempotent()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Replay", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Product Replay", null, "pcs", 100_000m, null, StockQuantity: 10, TrackInventory: true))).Data!;

        var sale = (await service.CreateSaleAsync(tenantId, "sale-rep-1", new(cust.Id, [new(prod.Id, 2m, 100_000m)]))).Data!;
        Assert.Equal(200_000m, sale.OutstandingBalance);

        var key = "acct-pay-replay-key-1";
        var payReq = new RecordCustomerAccountPaymentRequest(150_000m, "Bank Transfer", "Ref-123", "Note", DateTime.UtcNow);

        var res1 = await service.RecordCustomerAccountPaymentAsync(tenantId, cust.Id, key, payReq);
        Assert.True(res1.Success, res1.Message);
        Assert.Equal(150_000m, res1.Data!.TotalAmountPaid);
        Assert.Equal(150_000m, res1.Data.TotalAllocated);
        Assert.Equal(50_000m, res1.Data.RemainingBalance);
        Assert.Single(res1.Data.AffectedSales);

        // Retrying with the same idempotency key should succeed and return the identical replay result
        var res2 = await service.RecordCustomerAccountPaymentAsync(tenantId, cust.Id, key, payReq);
        Assert.True(res2.Success, res2.Message);
        Assert.Equal(150_000m, res2.Data!.TotalAmountPaid);
        Assert.Equal(150_000m, res2.Data.TotalAllocated);
        Assert.Equal(50_000m, res2.Data.RemainingBalance);
        Assert.Single(res2.Data.AffectedSales);

        // Verify only 1 payment was persisted in DB
        var totalPayments = await db.BusinessPayments.CountAsync(p => p.TenantId == tenantId && p.CustomerId == cust.Id);
        Assert.Equal(1, totalPayments);

        // Reusing the same key with different request payload must be rejected
        var diffReq = new RecordCustomerAccountPaymentRequest(50_000m, "Cash", "Ref-Different", "Note", DateTime.UtcNow);
        var resDiff = await service.RecordCustomerAccountPaymentAsync(tenantId, cust.Id, key, diffReq);
        Assert.False(resDiff.Success);
        Assert.Contains("This idempotency key was already used for a different payment.", resDiff.Message);
    }

    [Fact]
    public async Task Finding2_VoidedPurchase_CannotReceivePayments()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var supp = (await service.CreateSupplierAsync(tenantId, new("Supplier Test", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Product Test", null, "pcs", 50_000m, null, StockQuantity: 10, TrackInventory: true))).Data!;

        var purchase = (await service.CreatePurchaseAsync(tenantId, "pur-1", new(supp.Id, [new("Item 1", "pcs", 5m, 30_000m, prod.Id)]))).Data!;
        Assert.Equal("Posted", purchase.Status);

        var voidRes = await service.VoidPurchaseAsync(tenantId, purchase.Id);
        Assert.True(voidRes.Success, voidRes.Message);
        Assert.Equal("Voided", voidRes.Data!.Status);

        var payRes = await service.RecordPurchasePaymentAsync(tenantId, purchase.Id, "pur-pay-void", new(50_000m, "Bank Transfer"));
        Assert.False(payRes.Success);
        Assert.Equal("This purchase cannot receive payments.", payRes.Message);
        Assert.Empty(db.PurchasePayments);
    }

    [Fact]
    public async Task Finding3a_CreatePurchase_RejectsDuplicateProductLines()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var supp = (await service.CreateSupplierAsync(tenantId, new("Supplier Dup", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Product Dup", null, "pcs", 50_000m, null))).Data!;

        var items = new List<CreatePurchaseItemRequest>
        {
            new("Line 1", "pcs", 5m, 20_000m, prod.Id),
            new("Line 2", "pcs", 5m, 20_000m, prod.Id)
        };

        var res = await service.CreatePurchaseAsync(tenantId, "pur-dup", new(supp.Id, items));
        Assert.False(res.Success);
        Assert.Equal("Add each product only once per purchase.", res.Message);
    }

    [Fact]
    public async Task Finding3b_VoidPurchase_AggregatesProductLinesAndPreventsNegativeStock()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var supp = (await service.CreateSupplierAsync(tenantId, new("Supplier Agg", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Product Agg", null, "pcs", 100_000m, null, StockQuantity: 0, TrackInventory: true))).Data!;

        // Manually seed a legacy purchase with 2 lines for the same product (5 + 5 = 10 units received)
        var pur = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supp.Id,
            PurchaseNumber = "PUR-LEGACY-001",
            Currency = "VND",
            Status = "Posted",
            TotalAmount = 200_000m,
            IdempotencyKey = "pur-legacy-1",
            RequestHash = "hash",
            PurchasedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Supplier = await db.Suppliers.FirstAsync(s => s.Id == supp.Id)
        };
        pur.Items.Add(new PurchaseItem { Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = pur.Id, ProductId = prod.Id, Description = "Line 1", Unit = "pcs", Quantity = 5m, UnitCost = 20_000m, LineTotal = 100_000m });
        pur.Items.Add(new PurchaseItem { Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = pur.Id, ProductId = prod.Id, Description = "Line 2", Unit = "pcs", Quantity = 5m, UnitCost = 20_000m, LineTotal = 100_000m });
        db.Purchases.Add(pur);

        var prodEntity = await db.Products.FirstAsync(p => p.Id == prod.Id);
        prodEntity.StockQuantity = 10m; // 10 units received
        await db.SaveChangesAsync();

        // Customer buys 4 units, leaving 6 in stock (less than the 10 units received in this purchase)
        prodEntity.StockQuantity = 6m;
        await db.SaveChangesAsync();

        // Voiding must fail because 6 < 10 (even though 6 >= 5 for each individual line)
        var voidRes = await service.VoidPurchaseAsync(tenantId, pur.Id);
        Assert.False(voidRes.Success);
        Assert.Contains("has only 6 in stock, but 10 were received in this purchase", voidRes.Message);

        // Verify stock quantity was NOT reduced
        var verifyProd = await db.Products.AsNoTracking().FirstAsync(p => p.Id == prod.Id);
        Assert.Equal(6m, verifyProd.StockQuantity);
    }

    [Fact]
    public async Task Finding4a_CreateProduct_RejectsNegativeStockAndMinStockLevel()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var resNegativeStock = await service.CreateProductAsync(tenantId,
            new("Negative Stock Prod", null, "pcs", 100m, null, StockQuantity: -1m));
        Assert.False(resNegativeStock.Success);
        Assert.Equal("Stock quantity cannot be negative.", resNegativeStock.Message);

        var resNegativeMinStock = await service.CreateProductAsync(tenantId,
            new("Negative Min Stock Prod", null, "pcs", 100m, null, StockQuantity: 0m, MinStockLevel: -5m));
        Assert.False(resNegativeMinStock.Success);
        Assert.Equal("Minimum stock level cannot be negative.", resNegativeMinStock.Message);
    }

    [Fact]
    public async Task Finding4b_EntityValidationInterceptor_RejectsNegativeProductStockAndCosts()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var badProduct1 = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Bad Stock",
            Unit = "pcs",
            DefaultPrice = 10m,
            StockQuantity = -2m,
            Currency = "VND"
        };
        db.Products.Add(badProduct1);
        await Assert.ThrowsAsync<ValidationException>(() => db.SaveChangesAsync());
        db.ChangeTracker.Clear();

        var badProduct2 = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Bad Min Level",
            Unit = "pcs",
            DefaultPrice = 10m,
            StockQuantity = 5m,
            MinStockLevel = -1m,
            Currency = "VND"
        };
        db.Products.Add(badProduct2);
        await Assert.ThrowsAsync<ValidationException>(() => db.SaveChangesAsync());
        db.ChangeTracker.Clear();

        var badProduct3 = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Bad Cost Price",
            Unit = "pcs",
            DefaultPrice = 10m,
            CostPrice = -5m,
            Currency = "VND"
        };
        db.Products.Add(badProduct3);
        await Assert.ThrowsAsync<ValidationException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Finding5_AiActionsAndAgent_RejectReadOnlyUsers()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);
        var userId = Guid.NewGuid();
        db.Users.Add(new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "readonly@example.test",
            Role = "ReadOnly",
            IsActive = true,
            PreferredCurrency = "VND"
        });
        await db.SaveChangesAsync();

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AI_PROVIDER_API_KEY"] = ""
        }).Build();
        var parser = new AiAssistantService(db, service, config, new DummyHttpClientFactory(), NullLogger<AiAssistantService>.Instance);
        var actionService = new AiActionService(db, parser, service, new HttpContextAccessor { HttpContext = new DefaultHttpContext() });

        // ProposeAsync must reject ReadOnly user
        var propRes = await actionService.ProposeAsync(tenantId, userId, new("Record sale of 100k", null), userRole: "ReadOnly");
        Assert.False(propRes.Success);
        Assert.Equal("Only workspace administrators and operations managers can propose business actions.", propRes.Message);

        // ConfirmAsync must reject ReadOnly user
        var dummyActionId = Guid.NewGuid();
        db.AiActions.Add(new AiAction
        {
            Id = dummyActionId,
            TenantId = tenantId,
            UserId = userId,
            Intent = "sale",
            RiskLevel = "Medium",
            Status = AiActionStatuses.PendingConfirmation,
            SourceText = "Record sale",
            PayloadJson = "{}",
            IdempotencyKey = "action-dummy-1",
            RequiresConfirmation = true,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        await db.SaveChangesAsync();

        var confirmRes = await actionService.ConfirmAsync(tenantId, userId, dummyActionId, confirmed: true, userRole: "ReadOnly");
        Assert.False(confirmRes.Success);
        Assert.Equal("Only workspace administrators and operations managers can execute business actions.", confirmRes.Message);

        // AiAgentService propose_transaction tool must also reject ReadOnly
        var agentService = new AiAgentService(db, service, actionService, config, new DummyHttpClientFactory(), NullLogger<AiAgentService>.Instance);
        var agentChatRes = await agentService.AgentChatAsync(tenantId, userId, new("Record an expense of 50000 for office supplies"), userRole: "ReadOnly");
        Assert.True(agentChatRes.Success);
        // Proposal must not have been captured because propose_transaction is denied
        Assert.Null(agentChatRes.Data!.Proposal);
    }

    [Fact]
    public void Finding6_AuditController_EnforcesTenantAdminRole()
    {
        var authAttr = typeof(AuditController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttr);
        Assert.Equal("TenantAdmin", authAttr.Roles);
    }

    [Fact]
    public async Task Finding7_AuditLogSaveChangesInterceptor_CapturesDeletedEntitySnapshot()
    {
        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext()
        };
        var testUserId = Guid.NewGuid();
        httpContextAccessor.HttpContext.User = new System.Security.Claims.ClaimsPrincipal(
            new System.Security.Claims.ClaimsIdentity([
                new System.Security.Claims.Claim("sub", testUserId.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "admin@example.test")
            ], "TestAuth"));

        await using var db = Db(httpContextAccessor);
        var (service, tenantId) = await SetupBusiness(db);

        // Create an expense
        var exp = new BusinessExpense
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Category = "Utilities",
            Amount = 150_000m,
            Currency = "VND",
            Description = "Electricity bill",
            IdempotencyKey = "exp-audit-test-1",
            RequestHash = "hash1",
            ExpenseDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        db.BusinessExpenses.Add(exp);
        await db.SaveChangesAsync();

        // Delete the expense
        db.BusinessExpenses.Remove(exp);
        await db.SaveChangesAsync();

        // Inspect audit log for the delete action
        var deleteLog = await db.AuditLogs.FirstOrDefaultAsync(l => l.TenantId == tenantId && l.Action == "Deleted" && l.EntityId == exp.Id.ToString());
        Assert.NotNull(deleteLog);
        Assert.NotNull(deleteLog.OldValue);
        Assert.Contains("Utilities", deleteLog.OldValue);
        Assert.Contains("Electricity bill", deleteLog.OldValue);
        Assert.Contains("150000", deleteLog.OldValue);
        Assert.Equal("BusinessExpense deleted with Id " + exp.Id, deleteLog.Notes);
    }

    [Fact]
    public async Task Finding8_Dashboard_PeriodInterval_ExcludesMidnightOfNextDay()
    {
        await using var db = Db();
        var (service, tenantId) = await SetupBusiness(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Dash", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Product Dash", null, "pcs", 100_000m, null, StockQuantity: 100, TrackInventory: true))).Data!;

        // Sale 1 on 2026-10-15 15:00:00 UTC
        var day1 = new DateTime(2026, 10, 15, 15, 0, 0, DateTimeKind.Utc);
        var sale1 = (await service.CreateSaleAsync(tenantId, "sale-dash-1", new(cust.Id, [new(prod.Id, 1m, 100_000m)], SoldAt: day1))).Data!;

        // Sale 2 on 2026-10-16 00:00:00 UTC (midnight of the next day)
        var day2Midnight = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc);
        var sale2 = (await service.CreateSaleAsync(tenantId, "sale-dash-2", new(cust.Id, [new(prod.Id, 1m, 200_000m)], SoldAt: day2Midnight))).Data!;

        // Query custom range for 2026-10-15 only (from = 2026-10-15, to = 2026-10-15)
        var dashRes = await service.GetDashboardAsync(tenantId, "custom", from: new DateTime(2026, 10, 15), to: new DateTime(2026, 10, 15));
        Assert.True(dashRes.Success, dashRes.Message);

        // periodSales must only include sale1 (100_000m), NOT sale2 at midnight of 2026-10-16
        Assert.Equal(100_000m, dashRes.Data!.PeriodSales);
    }

    [Fact]
    public async Task Finding10_DatabaseSeeder_DemoMode_PopulatesRealisticBusinessRecords_AndIsIdempotent()
    {
        var prevSeedEnv = Environment.GetEnvironmentVariable("SEED_DEMO_DATA");
        try
        {
            Environment.SetEnvironmentVariable("SEED_DEMO_DATA", "true");
            await using var db = Db();

            // First seed pass: fresh database
            await DatabaseSeeder.SeedAsync(db);

            var tenant = await db.Tenants.Include(t => t.Users).FirstOrDefaultAsync(t => t.Id == DatabaseSeeder.DemoTenantId);
            Assert.NotNull(tenant);
            Assert.Single(tenant.Users);
            Assert.Equal("TenantAdmin", tenant.Users.First().Role);

            var products = await db.Products.Where(p => p.TenantId == tenant.Id).ToListAsync();
            Assert.Equal(6, products.Count);

            // Low-stock item check
            var lowStockItem = products.FirstOrDefault(p => p.Sku == "COFFEE-BMT-500");
            Assert.NotNull(lowStockItem);
            Assert.True(lowStockItem.StockQuantity < lowStockItem.MinStockLevel);

            var customers = await db.Customers.Where(c => c.TenantId == tenant.Id).ToListAsync();
            Assert.Equal(4, customers.Count);

            var suppliers = await db.Suppliers.Where(s => s.TenantId == tenant.Id).ToListAsync();
            Assert.Equal(3, suppliers.Count);

            var sales = await db.Sales.Where(s => s.TenantId == tenant.Id).ToListAsync();
            Assert.Equal(4, sales.Count);

            var purchases = await db.Purchases.Where(p => p.TenantId == tenant.Id).ToListAsync();
            Assert.Equal(3, purchases.Count);

            var expenses = await db.BusinessExpenses.Where(e => e.TenantId == tenant.Id).ToListAsync();
            Assert.Equal(3, expenses.Count);

            var adjustments = await db.StockAdjustments.Where(a => a.TenantId == tenant.Id).ToListAsync();
            Assert.Single(adjustments);

            // Verify financial dashboard aggregation on seeded data
            var service = new BusinessService(db);
            var dashRes = await service.GetDashboardAsync(tenant.Id, "all");
            Assert.True(dashRes.Success);
            var dash = dashRes.Data!;
            Assert.True(dash.PeriodSales > 0);
            Assert.True(dash.PeriodCogs > 0);
            Assert.True(dash.PeriodExpenses > 0);
            Assert.True(dash.OutstandingCustomers > 0);
            Assert.True(dash.OutstandingSuppliers > 0);
            Assert.NotEmpty(dash.RecentActivity);
            Assert.NotEmpty(dash.UnpaidCustomers);
            Assert.NotEmpty(dash.UnpaidSuppliers);

            // Second seed pass: verify idempotency (no duplicate entries)
            await DatabaseSeeder.SeedAsync(db);
            Assert.Equal(6, await db.Products.CountAsync(p => p.TenantId == tenant.Id));
            Assert.Equal(4, await db.Sales.CountAsync(s => s.TenantId == tenant.Id));
            Assert.Equal(3, await db.Purchases.CountAsync(p => p.TenantId == tenant.Id));
        }
        finally
        {
            Environment.SetEnvironmentVariable("SEED_DEMO_DATA", prevSeedEnv);
        }
    }
}

