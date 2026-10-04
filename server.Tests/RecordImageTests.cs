using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class RecordImageTests
{
    private const string TinyPng = "data:image/png;base64,iVBORw0KGgo=";

    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(BusinessService Service, Guid TenantId)> Setup(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Image test business",
            ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "VND",
            PlanType = "Business",
            Status = "Active"
        });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return (new BusinessService(db), tenantId);
    }

    [Fact]
    public async Task ProductImageIsReturnedAndCanBeRemoved()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var created = await service.CreateProductAsync(tenantId,
            new CreateProductRequest("Coffee", "COFFEE", "bag", 150_000m, ImageDataUrl: TinyPng));

        Assert.True(created.Success);
        Assert.Equal(TinyPng, created.Data!.ImageDataUrl);

        var updated = await service.UpdateProductAsync(tenantId, created.Data.Id,
            new UpdateProductRequest("Coffee", "COFFEE", "bag", 150_000m, RemoveImage: true));

        Assert.True(updated.Success);
        Assert.Null(updated.Data!.ImageDataUrl);
        Assert.Null((await db.Products.SingleAsync(TestContext.Current.CancellationToken)).ImageDataUrl);
    }

    [Fact]
    public async Task UnsupportedImagePayloadIsRejected()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var created = await service.CreateProductAsync(tenantId,
            new CreateProductRequest("Unsafe", null, "item", 1m,
                ImageDataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="));

        Assert.False(created.Success);
        Assert.Contains("JPEG, PNG, or WebP", created.Message);
        Assert.Empty(db.Products);
    }

    [Fact]
    public async Task ExpenseReceiptIsReturnedAndCanBeRemoved()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var created = await service.CreateBusinessExpenseAsync(tenantId, "receipt-create",
            new CreateBusinessExpenseRequest("Supplies", 75_000m, ReceiptImageDataUrl: TinyPng));

        Assert.True(created.Success);
        Assert.Equal(TinyPng, created.Data!.ReceiptImageDataUrl);

        var updated = await service.UpdateBusinessExpenseAsync(tenantId, created.Data.Id,
            new UpdateBusinessExpenseRequest("Supplies", 75_000m, RemoveReceiptImage: true));

        Assert.True(updated.Success);
        Assert.Null(updated.Data!.ReceiptImageDataUrl);
    }

    [Fact]
    public async Task PurchaseInvoiceImageIsReturnedWithTheRecordedPurchase()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var supplier = await service.CreateSupplierAsync(tenantId,
            new CreateSupplierRequest("Coffee supplier", null, null, null, null));

        var created = await service.CreatePurchaseAsync(tenantId, "invoice-create",
            new CreatePurchaseRequest(supplier.Data!.Id, [new CreatePurchaseItemRequest("Beans", "kg", 2m, 90_000m)],
                InvoiceImageDataUrl: TinyPng));

        Assert.True(created.Success);
        Assert.Equal(TinyPng, created.Data!.InvoiceImageDataUrl);

        var loaded = await service.GetPurchaseAsync(tenantId, created.Data.Id);
        Assert.Equal(TinyPng, loaded.Data!.InvoiceImageDataUrl);
    }

    [Fact]
    public async Task ProductImageAuditStoresAMarkerInsteadOfTheBase64Payload()
    {
        var accessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new AuditLogSaveChangesInterceptor(accessor))
            .Options;
        await using var db = new AppDbContext(options);
        var (service, tenantId) = await Setup(db);

        var created = await service.CreateProductAsync(tenantId,
            new CreateProductRequest("Audited coffee", null, "bag", 100_000m, ImageDataUrl: TinyPng));

        Assert.True(created.Success);
        var audit = await db.AuditLogs.AsNoTracking()
            .Where(log => log.EntityType == "Product")
            .OrderByDescending(log => log.Timestamp)
            .FirstAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain("data:image", audit.NewValue);
        Assert.Contains("stored image omitted", audit.NewValue);
        Assert.True(audit.Notes!.Length <= 1000);
    }
}
