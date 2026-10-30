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

public sealed class Phase2InlineCreateAndRecurringExpensesTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(BusinessService Service, Guid TenantId, Guid UserId)> Setup(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Phase 2 Test Tenant",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            PlanType = "Business",
            Status = "Active"
        });
        db.Users.Add(new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "admin@phase2test.com",
            PasswordHash = "hashed",
            Role = "TenantAdmin",
            FullName = "Admin User"
        });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var service = new BusinessService(db);
        return (service, tenantId, userId);
    }

    [Fact]
    public async Task RecurringExpenseTemplate_Create_Update_Delete_AndList()
    {
        await using var db = Db();
        var (service, tenantId, userId) = await Setup(db);

        // 1. Create template
        var createResult = await service.CreateRecurringExpenseTemplateAsync(tenantId, userId, new CreateRecurringExpenseTemplateRequest(
            Category: "Rent",
            Amount: 15_000_000m,
            Frequency: "monthly",
            NextDueDate: DateTime.UtcNow.AddDays(5),
            Description: "Store monthly rent"
        ));

        Assert.True(createResult.Success);
        Assert.NotNull(createResult.Data);
        Assert.Equal("Rent", createResult.Data.Category);
        Assert.Equal(15_000_000m, createResult.Data.Amount);
        Assert.Equal("monthly", createResult.Data.Frequency);
        var templateId = createResult.Data.Id;

        // 2. List templates
        var listResult = await service.GetRecurringExpenseTemplatesAsync(tenantId);
        Assert.True(listResult.Success);
        Assert.Single(listResult.Data!);

        // 3. Update template
        var updateResult = await service.UpdateRecurringExpenseTemplateAsync(tenantId, templateId, new UpdateRecurringExpenseTemplateRequest(
            Amount: 16_000_000m,
            Description: "Updated store rent"
        ));
        Assert.True(updateResult.Success);
        Assert.Equal(16_000_000m, updateResult.Data!.Amount);
        Assert.Equal("Updated store rent", updateResult.Data.Description);

        // 4. Delete template
        var deleteResult = await service.DeleteRecurringExpenseTemplateAsync(tenantId, templateId);
        Assert.True(deleteResult.Success);

        var listAfter = await service.GetRecurringExpenseTemplatesAsync(tenantId);
        Assert.Empty(listAfter.Data!);
    }

    [Fact]
    public async Task ProcessDueRecurringExpenses_GeneratesPendingDraftActions_AndAdvancesDueDate()
    {
        await using var db = Db();
        var (service, tenantId, userId) = await Setup(db);

        var pastDue = DateTime.UtcNow.AddDays(-2);
        var futureDue = DateTime.UtcNow.AddDays(20);

        // Template 1: Due
        await service.CreateRecurringExpenseTemplateAsync(tenantId, userId, new CreateRecurringExpenseTemplateRequest(
            Category: "Utilities",
            Amount: 2_500_000m,
            Frequency: "monthly",
            NextDueDate: pastDue,
            Description: "Electricity and water"
        ));

        // Template 2: Not yet due
        await service.CreateRecurringExpenseTemplateAsync(tenantId, userId, new CreateRecurringExpenseTemplateRequest(
            Category: "Internet",
            Amount: 500_000m,
            Frequency: "monthly",
            NextDueDate: futureDue,
            Description: "Fiber internet"
        ));

        // Process due
        var processResult = await service.ProcessDueRecurringExpensesAsync(tenantId, userId);
        Assert.True(processResult.Success);
        Assert.Equal(1, processResult.Data!.ProcessedCount);
        Assert.Equal(1, processResult.Data.DraftsCreatedCount);

        // Verify draft AiAction created
        var draftActions = await db.AiActions.Where(a => a.TenantId == tenantId).ToListAsync();
        Assert.Single(draftActions);
        var action = draftActions.First();
        Assert.Equal("expense", action.Intent);
        Assert.Equal(AiActionStatuses.PendingConfirmation, action.Status);
        Assert.True(action.RequiresConfirmation);
        Assert.Contains("2500000", action.PayloadJson);
        Assert.Contains("Utilities", action.PayloadJson);

        // Verify template NextDueDate advanced to future
        var templates = await db.RecurringExpenseTemplates.Where(t => t.TenantId == tenantId).ToListAsync();
        var updatedTemplate = templates.First(t => t.Category == "Utilities");
        Assert.True(updatedTemplate.NextDueDate > DateTime.UtcNow);
        Assert.NotNull(updatedTemplate.LastGeneratedAt);
    }

    [Fact]
    public async Task ProcessDueRecurringExpenses_IsIdempotent_DoesNotDuplicateDraft()
    {
        await using var db = Db();
        var (service, tenantId, userId) = await Setup(db);

        var pastDue = DateTime.UtcNow.AddHours(-1);
        await service.CreateRecurringExpenseTemplateAsync(tenantId, userId, new CreateRecurringExpenseTemplateRequest(
            Category: "Salaries",
            Amount: 30_000_000m,
            Frequency: "monthly",
            NextDueDate: pastDue,
            Description: "Staff payroll"
        ));

        // Process 1
        var p1 = await service.ProcessDueRecurringExpensesAsync(tenantId, userId);
        Assert.Equal(1, p1.Data!.DraftsCreatedCount);

        // Process 2 (since NextDueDate advanced, nothing due)
        var p2 = await service.ProcessDueRecurringExpensesAsync(tenantId, userId);
        Assert.Equal(0, p2.Data!.DraftsCreatedCount);

        var count = await db.AiActions.CountAsync(a => a.TenantId == tenantId);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task GetProductSmartDefaults_ReturnsLastUnitCostAndUsualSupplier()
    {
        await using var db = Db();
        var (service, tenantId, _) = await Setup(db);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Sua Tuoi Dalat Milk",
            Unit = "hộp",
            DefaultPrice = 45000m,
            CostPrice = 30000m,
            IsActive = true
        };
        db.Products.Add(product);

        var supplierA = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Dalat Milk Co" };
        var supplierB = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Metro Cash & Carry" };
        db.Suppliers.AddRange(supplierA, supplierB);

        // Purchase 1 from Supplier A (cost 32000)
        var pur1 = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            PurchaseNumber = "PO-001",
            PurchasedAt = DateTime.UtcNow.AddDays(-10),
            Status = "Posted",
            TotalAmount = 320000m,
            IdempotencyKey = "po-1",
            RequestHash = "hash1"
        };
        db.Purchases.Add(pur1);
        db.PurchaseItems.Add(new PurchaseItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseId = pur1.Id,
            ProductId = product.Id,
            Description = product.Name,
            Unit = product.Unit,
            Quantity = 10,
            UnitCost = 32000m,
            LineTotal = 320000m
        });

        // Purchase 2 from Supplier A (cost 33000)
        var pur2 = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            PurchaseNumber = "PO-002",
            PurchasedAt = DateTime.UtcNow.AddDays(-5),
            Status = "Posted",
            TotalAmount = 330000m,
            IdempotencyKey = "po-2",
            RequestHash = "hash2"
        };
        db.Purchases.Add(pur2);
        db.PurchaseItems.Add(new PurchaseItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseId = pur2.Id,
            ProductId = product.Id,
            Description = product.Name,
            Unit = product.Unit,
            Quantity = 10,
            UnitCost = 33000m,
            LineTotal = 330000m
        });

        // Purchase 3 from Supplier B (cost 35000, 1 day ago)
        var pur3 = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierB.Id,
            PurchaseNumber = "PO-003",
            PurchasedAt = DateTime.UtcNow.AddDays(-1),
            Status = "Posted",
            TotalAmount = 350000m,
            IdempotencyKey = "po-3",
            RequestHash = "hash3"
        };
        db.Purchases.Add(pur3);
        db.PurchaseItems.Add(new PurchaseItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseId = pur3.Id,
            ProductId = product.Id,
            Description = product.Name,
            Unit = product.Unit,
            Quantity = 10,
            UnitCost = 35000m,
            LineTotal = 350000m
        });

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        // 1. Without supplier: should return Supplier A as usual (2 purchases vs 1), and last unit cost = 35000
        var defaults = await service.GetProductSmartDefaultsAsync(tenantId, product.Id);
        Assert.True(defaults.Success);
        Assert.Equal(supplierA.Id, defaults.Data!.UsualSupplierId);
        Assert.Equal("Dalat Milk Co", defaults.Data.UsualSupplierName);
        Assert.Equal(35000m, defaults.Data.LastUnitCost);
        Assert.Equal(45000m, defaults.Data.DefaultPrice);
        Assert.Equal("hộp", defaults.Data.Unit);

        // 2. Specific supplier A: last cost from Supplier A was 33000
        var defaultsSupplierA = await service.GetProductSmartDefaultsAsync(tenantId, product.Id, supplierA.Id);
        Assert.True(defaultsSupplierA.Success);
        Assert.Equal(33000m, defaultsSupplierA.Data!.LastUnitCost);
    }

    [Fact]
    public async Task GetSupplierSmartDefaults_ReturnsUsualPaymentMethodAndNetDueDate()
    {
        await using var db = Db();
        var (service, tenantId, _) = await Setup(db);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Vinamilk Distribution",
            PaymentTermsDays = 30
        };
        db.Suppliers.Add(supplier);

        // Record payments: 2 Bank transfer, 1 Cash
        var pur = new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplier.Id,
            PurchaseNumber = "PO-VM",
            PurchasedAt = DateTime.UtcNow.AddDays(-10),
            Status = "Posted",
            TotalAmount = 5_000_000m,
            IdempotencyKey = "po-vm",
            RequestHash = "hash-vm"
        };
        db.Purchases.Add(pur);
        db.PurchasePayments.Add(new PurchasePayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseId = pur.Id,
            SupplierId = supplier.Id,
            Amount = 1_000_000m,
            Method = "Bank transfer",
            PaidAt = DateTime.UtcNow.AddDays(-8),
            IdempotencyKey = "pp-1",
            RequestHash = "hash-pp1"
        });
        db.PurchasePayments.Add(new PurchasePayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseId = pur.Id,
            SupplierId = supplier.Id,
            Amount = 1_000_000m,
            Method = "Bank transfer",
            PaidAt = DateTime.UtcNow.AddDays(-5),
            IdempotencyKey = "pp-2",
            RequestHash = "hash-pp2"
        });
        db.PurchasePayments.Add(new PurchasePayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseId = pur.Id,
            SupplierId = supplier.Id,
            Amount = 1_000_000m,
            Method = "Cash",
            PaidAt = DateTime.UtcNow.AddDays(-2),
            IdempotencyKey = "pp-3",
            RequestHash = "hash-pp3"
        });

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var defaults = await service.GetSupplierSmartDefaultsAsync(tenantId, supplier.Id);
        Assert.True(defaults.Success);
        Assert.Equal("Bank transfer", defaults.Data!.UsualPaymentMethod);
        Assert.Equal(30, defaults.Data.PaymentTermsDays);
        Assert.Equal(DateTime.UtcNow.Date.AddDays(30), defaults.Data.DefaultDueDate.Date);
    }

    [Fact]
    public async Task AttentionFeed_DetectsRecurringExpensesDue()
    {
        await using var db = Db();
        var (service, tenantId, userId) = await Setup(db);

        // Add due recurring template
        await service.CreateRecurringExpenseTemplateAsync(tenantId, userId, new CreateRecurringExpenseTemplateRequest(
            Category: "Office Rent",
            Amount: 20_000_000m,
            Frequency: "monthly",
            NextDueDate: DateTime.UtcNow.AddDays(-1)
        ));

        var attentionResult = await service.GetDashboardAttentionItemsAsync(tenantId);
        Assert.True(attentionResult.Success);
        var item = attentionResult.Data!.FirstOrDefault(i => i.Type == "recurring_expense_due");
        Assert.NotNull(item);
        Assert.Equal("warn", item.Severity);
        Assert.Contains("Office Rent", item.Subtitle);
    }
}
