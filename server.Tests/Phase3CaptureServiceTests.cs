using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Localization;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class Phase3CaptureServiceTests
{
    private static AppDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new AppDbContext(options);
    }

    private static (CaptureService capture, ObjectStorageService storage, AiActionService actionService, AppDbContext db, Guid tenantId, Guid userId) CreateTestEnvironment(string dbName)
    {
        var db = CreateInMemoryDb(dbName);
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Test Supermarket",
            ApiKey = Guid.NewGuid().ToString("N"),
            PlanType = "Professional",
            BaseCurrency = "VND",
            Status = "Active"
        });
        db.Users.Add(new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = "manager@tenvora.local",
            PasswordHash = "hash123",
            Role = "TenantAdmin",
            FullName = "Store Manager",
            PreferredCurrency = "VND",
            IsActive = true
        });
        db.SaveChanges();

        var envMock = new Mock<IWebHostEnvironment>();
        var tempWebRoot = Path.Combine(Path.GetTempPath(), "tenvora_tests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWebRoot);
        envMock.Setup(e => e.WebRootPath).Returns(tempWebRoot);
        envMock.Setup(e => e.ContentRootPath).Returns(tempWebRoot);

        var configMock = new Mock<IConfiguration>();
        var storage = new ObjectStorageService(envMock.Object, configMock.Object, NullLogger<ObjectStorageService>.Instance);
        var localizer = new AppLocalizer();
        var businessService = new BusinessService(db);
        var assistantServiceMock = new Mock<IAiAssistantService>();

        var httpAccessorMock = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        var actionService = new AiActionService(
            db,
            assistantServiceMock.Object,
            businessService,
            httpAccessorMock.Object,
            null,
            localizer
        );

        var httpFactoryMock = new Mock<IHttpClientFactory>();
        var capture = new CaptureService(
            db,
            storage,
            actionService,
            localizer,
            configMock.Object,
            httpFactoryMock.Object,
            NullLogger<CaptureService>.Instance
        );

        return (capture, storage, actionService, db, tenantId, userId);
    }

    [Fact]
    public async Task ObjectStorage_UploadsStreamAndDataUrl_ReturnsHostedRelativePath()
    {
        var (capture, storage, _, _, tenantId, _) = CreateTestEnvironment("storage_test");

        var textBytes = Encoding.UTF8.GetBytes("Fake invoice content");
        using var stream = new MemoryStream(textBytes);
        var result = await storage.UploadAsync(stream, "test_invoice.txt", "text/plain", $"tenvora/{tenantId}/invoices");

        Assert.NotNull(result);
        Assert.StartsWith("/uploads/", result.Url);
        Assert.NotEmpty(result.FileHash);
        Assert.Equal(textBytes.Length, result.SizeBytes);

        // Upload Data URL
        var dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        var dataResult = await storage.UploadDataUrlAsync(dataUrl, $"tenvora/{tenantId}/invoices", "tiny.png");

        Assert.NotNull(dataResult);
        Assert.StartsWith("/uploads/", dataResult.Url);
        Assert.NotEmpty(dataResult.FileHash);
    }

    [Fact]
    public async Task NaturalLanguageQuickAdd_StagesPurchaseDraft_WithoutCommittingToDatabase()
    {
        var (capture, _, _, db, tenantId, userId) = CreateTestEnvironment("nl_quick_add");

        var prompt = "bought 20 boxes Coffee Filter from Highlands Supplier 5M, paid half";
        var result = await capture.AnalyzeAndStageAsync(tenantId, userId, new AnalyzeDocumentRequest(RawText: prompt));

        Assert.True(result.Success);
        Assert.NotNull(result.Data);

        var draft = result.Data.Draft;
        Assert.Equal("Highlands Supplier", draft.Vendor);
        Assert.Equal(5_000_000m, draft.TotalAmount);
        Assert.Equal(2_500_000m, draft.PaidAmount);
        Assert.Single(draft.LineItems);
        Assert.Equal(20m, draft.LineItems[0].Quantity);
        Assert.Equal("boxes", draft.LineItems[0].Unit);
        Assert.Equal(250_000m, draft.LineItems[0].UnitCost);

        // Financial invariant check: ZERO purchases exist yet in the database!
        var committedPurchases = await db.Purchases.CountAsync(p => p.TenantId == tenantId);
        Assert.Equal(0, committedPurchases);

        // An AiAction is created in PendingConfirmation status
        var staged = await db.AiActions.FirstOrDefaultAsync(a => a.Id == result.Data.ActionId);
        Assert.NotNull(staged);
        Assert.Equal(AiActionStatuses.PendingConfirmation, staged.Status);
        Assert.True(staged.RequiresConfirmation);
    }

    [Fact]
    public async Task VietnameseInvoiceText_ParsesTabularItems_AndValidatesSum()
    {
        var (capture, _, _, _, tenantId, userId) = CreateTestEnvironment("vi_invoice");

        var invoiceText = @"
CÔNG TY TNHH THỰC PHẨM MINH HÀ
Ngày 24 tháng 10 năm 2026
1. Cà phê Robusta Đắk Lắk 10 kg 75000 750000
2. Sữa đặc Phương Nam 5 lon 25000 125000
Thuế GTGT: 87500
Tổng cộng: 962500
Đã thanh toán: 962500
";
        var result = await capture.AnalyzeAndStageAsync(tenantId, userId, new AnalyzeDocumentRequest(RawText: invoiceText));

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        var draft = result.Data.Draft;

        Assert.Contains("MINH HÀ", draft.Vendor);
        Assert.Equal(962_500m, draft.TotalAmount);
        Assert.Equal(87_500m, draft.TaxAmount);
        Assert.Equal(962_500m, draft.PaidAmount);
        Assert.Equal(2, draft.LineItems.Count);
        Assert.Equal(10m, draft.LineItems[0].Quantity);
        Assert.Equal("kg", draft.LineItems[0].Unit);
        Assert.Equal(75_000m, draft.LineItems[0].UnitCost);
        Assert.Empty(draft.ValidationErrors);
    }

    [Fact]
    public async Task LearningLoop_SavedAliasRule_OverridesFuzzyMatchingWithFullConfidence()
    {
        var (capture, _, _, db, tenantId, userId) = CreateTestEnvironment("learning_loop");

        // Seed supplier
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Công ty Cổ phần Sữa Việt Nam (Vinamilk)",
            Status = "Active"
        };
        db.Suppliers.Add(supplier);

        // Add learning loop rule: "Vinamilk" -> Supplier Id
        await capture.CreateExtractionRuleAsync(tenantId, new CreateExtractionRuleRequest(
            RuleType: "vendor_alias",
            RawPattern: "Vinamilk",
            TargetEntityId: supplier.Id,
            TargetName: supplier.Name
        ));

        // Invoice text mentioning alias "Vinamilk"
        var invoice = "Supplier: Vinamilk\nTotal: 1500000";
        var result = await capture.AnalyzeAndStageAsync(tenantId, userId, new AnalyzeDocumentRequest(RawText: invoice));

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal(supplier.Id, result.Data.Draft.SupplierId);
        Assert.Equal(supplier.Name, result.Data.Draft.Vendor);
        Assert.Equal(1.0m, result.Data.Draft.Provenance.Fields["vendor"].Confidence);
        Assert.Contains("Matched via saved rule", result.Data.Draft.Provenance.Fields["vendor"].Why);
    }

    [Fact]
    public async Task DuplicateDetection_FlagsMatchingSupplierAmountAndDate()
    {
        var (capture, _, _, db, tenantId, userId) = CreateTestEnvironment("dup_detection");

        var supplierId = Guid.NewGuid();
        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, Name = "VinaPaper Co", Status = "Active" });

        // Existing purchase recorded yesterday
        var existingDate = DateTime.UtcNow.AddDays(-1);
        db.Purchases.Add(new Purchase
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierId,
            PurchaseNumber = "PO-0099",
            TotalAmount = 2_000_000m,
            Currency = "VND",
            Status = "Posted",
            PurchasedAt = existingDate,
            IdempotencyKey = "key_dup_1",
            RequestHash = "hash1"
        });
        await db.SaveChangesAsync();

        var prompt = "bought 20 boxes Paper from VinaPaper Co 2M, paid half";
        var result = await capture.AnalyzeAndStageAsync(tenantId, userId, new AnalyzeDocumentRequest(RawText: prompt));

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.Duplicate.IsDuplicate);
        Assert.Contains("PO-0099", result.Data.Duplicate.DuplicateReason);
    }

    [Fact]
    public async Task TwoPhaseConfirmation_ExplicitConfirmCreatesPurchaseAndItems()
    {
        var (capture, _, actionService, db, tenantId, userId) = CreateTestEnvironment("confirm_flow");

        var supplier = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Ace Supplies", Status = "Active" };
        var product = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Marker Pen", Sku = "PEN-01", Unit = "box", DefaultPrice = 50000, CostPrice = 35000, StockQuantity = 10, Currency = "VND", IsActive = true };
        db.Suppliers.Add(supplier);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var prompt = "bought 5 boxes Marker Pen from Ace Supplies 175k, paid in full";
        var stageResult = await capture.AnalyzeAndStageAsync(tenantId, userId, new AnalyzeDocumentRequest(RawText: prompt));

        Assert.True(stageResult.Success);
        var actionId = stageResult.Data!.ActionId;

        // Still 0 purchases
        Assert.Equal(0, await db.Purchases.CountAsync(p => p.TenantId == tenantId));

        // User reviews and confirms
        var confirmResult = await actionService.ConfirmAsync(tenantId, userId, actionId, true, "TenantAdmin");
        Assert.True(confirmResult.Success);
        Assert.Equal(AiActionStatuses.Executed, confirmResult.Data!.Status);

        // Now exactly 1 purchase is committed to the relational database!
        var committedPurchase = await db.Purchases.Include(p => p.Items).FirstOrDefaultAsync(p => p.TenantId == tenantId);
        Assert.NotNull(committedPurchase);
        Assert.Equal(175_000m, committedPurchase.TotalAmount);
        Assert.Single(committedPurchase.Items);
        Assert.Equal(5m, committedPurchase.Items.First().Quantity);
        Assert.Equal("box", committedPurchase.Items.First().Unit);
    }
}
