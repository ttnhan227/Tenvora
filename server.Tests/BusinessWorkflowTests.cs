using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Tenvora.Api.Data;
using Tenvora.Api.Controllers;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class BusinessWorkflowTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(BusinessService Service, Guid TenantId)> Setup(AppDbContext db, string currency = "VND")
    {
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId, CompanyName = "Test business", ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = currency, PlanType = "Business", Status = "Active"
        });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return (new BusinessService(db), tenantId);
    }

    private static async Task<(Guid CustomerId, Guid ProductId)> SeedCustomerAndProduct(BusinessService service, Guid tenantId)
    {
        var customer = await service.CreateCustomerAsync(tenantId, new("Anh Nam", "0900000000", null, null, null));
        var product = await service.CreateProductAsync(tenantId, new("Product A", null, "kg", 180_000m, null));
        Assert.True(customer.Success);
        Assert.True(product.Success);
        return (customer.Data!.Id, product.Data!.Id);
    }

    [Fact]
    public async Task GoldenWorkflowPreservesPaymentHistoryAndCalculatesBalance()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);

        var created = await service.CreateSaleAsync(tenantId, "sale-1",
            new(customerId, [new(productId, 15m, 180_000m)], 1_000_000m, "Cash", "First sale"));

        Assert.True(created.Success);
        Assert.Equal(2_700_000m, created.Data!.TotalAmount);
        Assert.Equal(1_000_000m, created.Data.PaidAmount);
        Assert.Equal(1_700_000m, created.Data.OutstandingBalance);
        Assert.Equal("Partially paid", created.Data.PaymentStatus);

        var paid = await service.RecordPaymentAsync(tenantId, created.Data.Id, "payment-1", new(500_000m, "Bank transfer"));

        Assert.True(paid.Success);
        Assert.Equal(1_500_000m, paid.Data!.PaidAmount);
        Assert.Equal(1_200_000m, paid.Data.OutstandingBalance);
        Assert.Equal(2, paid.Data.Payments.Count);
        Assert.Equal(2, await db.BusinessPayments.CountAsync(TestContext.Current.CancellationToken));

        var history = await service.GetCustomerAsync(tenantId, customerId);
        Assert.Equal(2_700_000m, history.Data!.Customer.TotalSales);
        Assert.Equal(1_500_000m, history.Data.Customer.TotalPaid);
        Assert.Equal(1_200_000m, history.Data.Customer.OutstandingBalance);
        Assert.Single(history.Data.Sales);
        Assert.Equal(2, history.Data.Payments.Count);
    }

    [Fact]
    public async Task MultipleItemsUseServerCalculatedTotals()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db, "USD");
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);
        var second = await service.CreateProductAsync(tenantId, new("Service B", "SERVICE-B", "hour", 25.50m, null));

        var sale = await service.CreateSaleAsync(tenantId, "multi",
            new(customerId, [new(productId, 2.5m, 10m), new(second.Data!.Id, 2m, null)]));

        Assert.True(sale.Success);
        Assert.Equal(76m, sale.Data!.TotalAmount);
        Assert.Equal(76m, sale.Data.OutstandingBalance);
        Assert.Equal("Unpaid", sale.Data.PaymentStatus);
        Assert.Equal(2, sale.Data.Items.Count);
    }

    [Fact]
    public async Task SaleAndPaymentRetriesAreIdempotent()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);
        var request = new CreateSaleRequest(customerId, [new(productId, 1m, 100m)]);

        var first = await service.CreateSaleAsync(tenantId, "same-sale", request);
        var replay = await service.CreateSaleAsync(tenantId, "same-sale", request);
        var changed = await service.CreateSaleAsync(tenantId, "same-sale", request with { PaymentAmount = 10m });

        Assert.Equal(first.Data!.Id, replay.Data!.Id);
        Assert.False(changed.Success);
        Assert.Single(db.Sales);

        var payment = new RecordBusinessPaymentRequest(40m, "Cash");
        var firstPayment = await service.RecordPaymentAsync(tenantId, first.Data.Id, "same-payment", payment);
        var paymentReplay = await service.RecordPaymentAsync(tenantId, first.Data.Id, "same-payment", payment);
        var paymentChanged = await service.RecordPaymentAsync(tenantId, first.Data.Id, "same-payment", payment with { Amount = 50m });

        Assert.Equal(40m, firstPayment.Data!.PaidAmount);
        Assert.Equal(40m, paymentReplay.Data!.PaidAmount);
        Assert.False(paymentChanged.Success);
        Assert.Single(db.BusinessPayments);
    }

    [Fact]
    public async Task RejectsOverpaymentWithoutWritingPartialData()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);
        var sale = await service.CreateSaleAsync(tenantId, "sale", new(customerId, [new(productId, 1m, 100m)]));

        var result = await service.RecordPaymentAsync(tenantId, sale.Data!.Id, "too-much", new(101m));

        Assert.False(result.Success);
        Assert.Empty(db.BusinessPayments);
        Assert.Equal(100m, (await service.GetSaleAsync(tenantId, sale.Data.Id)).Data!.OutstandingBalance);
    }

    [Fact]
    public async Task BusinessIsolationRejectsForeignCustomerProductAndReads()
    {
        await using var db = Db();
        var (service, businessA) = await Setup(db);
        var (_, businessB) = await Setup(db);
        var (customerA, productA) = await SeedCustomerAndProduct(service, businessA);
        var (customerB, productB) = await SeedCustomerAndProduct(service, businessB);

        var mixedCustomer = await service.CreateSaleAsync(businessA, "foreign-customer", new(customerB, [new(productA, 1m, 10m)]));
        var mixedProduct = await service.CreateSaleAsync(businessA, "foreign-product", new(customerA, [new(productB, 1m, 10m)]));

        Assert.False(mixedCustomer.Success);
        Assert.False(mixedProduct.Success);
        Assert.False((await service.GetCustomerAsync(businessA, customerB)).Success);
        Assert.Empty(db.Sales);
    }

    [Fact]
    public async Task CustomersAndProductsCanBeEditedAndSearched()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);

        var customer = await service.UpdateCustomerAsync(tenantId, customerId,
            new("Anh Nam Trading", "0912345678", null, "Market road", "Wholesale customer"));
        var product = await service.UpdateProductAsync(tenantId, productId,
            new("Product A Premium", "PREMIUM", "box", 250_000m, true, "Updated after validation"));
        var customerSearch = await service.GetCustomersAsync(tenantId, "091234", "Active");
        var productSearch = await service.GetProductsAsync(tenantId, "premium", true);

        Assert.Equal("Anh Nam Trading", customer.Data!.Name);
        Assert.Equal("box", product.Data!.Unit);
        Assert.Single(customerSearch.Data!);
        Assert.Single(productSearch.Data!);
    }

    [Fact]
    public async Task InvalidSaleValuesNeverCreateFinancialRecords()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);

        var zeroQuantity = await service.CreateSaleAsync(tenantId, "zero", new(customerId, [new(productId, 0m, 100m)]));
        var negativePrice = await service.CreateSaleAsync(tenantId, "negative", new(customerId, [new(productId, 1m, -1m)]));

        Assert.False(zeroQuantity.Success);
        Assert.False(negativePrice.Success);
        Assert.Empty(db.Sales);
        Assert.Empty(db.SaleItems);
        Assert.Empty(db.BusinessPayments);
    }

    [Fact]
    public void FinancialMutationsRequireAnOperationsRole()
    {
        var createSale = typeof(SalesController).GetMethod(nameof(SalesController.Create))!;
        var recordPayment = typeof(SalesController).GetMethod(nameof(SalesController.RecordPayment))!;
        var createPurchase = typeof(PurchasesController).GetMethod(nameof(PurchasesController.Create))!;
        var supplierPayment = typeof(PurchasesController).GetMethod(nameof(PurchasesController.Pay))!;
        var createExpense = typeof(BusinessExpensesController).GetMethod(nameof(BusinessExpensesController.Create))!;
        Assert.Equal("TenantAdmin,OperationsManager", createSale.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>().Single().Roles);
        Assert.Equal("TenantAdmin,OperationsManager", recordPayment.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>().Single().Roles);
        Assert.Equal("TenantAdmin,OperationsManager", createPurchase.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>().Single().Roles);
        Assert.Equal("TenantAdmin,OperationsManager", supplierPayment.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>().Single().Roles);
        Assert.Equal("TenantAdmin,OperationsManager", createExpense.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>().Single().Roles);
    }

    [Fact]
    public async Task PurchaseWorkflowPreservesSupplierPaymentHistoryAndBalance()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var supplier = await service.CreateSupplierAsync(tenantId, new("Local wholesaler", "0901", null, null, null));
        var purchase = await service.CreatePurchaseAsync(tenantId, "purchase-1",
            new(supplier.Data!.Id, [new("Raw material", "kg", 10m, 80_000m)], 300_000m, "Cash"));

        Assert.True(purchase.Success);
        Assert.Equal(800_000m, purchase.Data!.TotalAmount);
        Assert.Equal(500_000m, purchase.Data.OutstandingBalance);

        var paid = await service.RecordPurchasePaymentAsync(tenantId, purchase.Data.Id, "supplier-payment-1", new(200_000m, "Bank transfer"));
        Assert.True(paid.Success);
        Assert.Equal(300_000m, paid.Data!.OutstandingBalance);
        Assert.Equal(2, paid.Data.Payments.Count);

        var history = await service.GetSupplierAsync(tenantId, supplier.Data.Id);
        Assert.Equal(300_000m, history.Data!.Supplier.OutstandingBalance);
        Assert.Single(history.Data.Purchases);
        Assert.Equal(2, history.Data.Payments.Count);
    }

    [Fact]
    public async Task PurchasePaymentRejectsOverpaymentAndIsIdempotent()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var supplier = await service.CreateSupplierAsync(tenantId, new("Supplier", null, null, null, null));
        var purchase = await service.CreatePurchaseAsync(tenantId, "purchase", new(supplier.Data!.Id, [new("Boxes", "box", 2m, 50m)]));

        Assert.False((await service.RecordPurchasePaymentAsync(tenantId, purchase.Data!.Id, "too-much", new(101m))).Success);
        var first = await service.RecordPurchasePaymentAsync(tenantId, purchase.Data.Id, "same", new(40m));
        var replay = await service.RecordPurchasePaymentAsync(tenantId, purchase.Data.Id, "same", new(40m));

        Assert.Equal(first.Data!.OutstandingBalance, replay.Data!.OutstandingBalance);
        Assert.Single(db.PurchasePayments);
    }

    [Fact]
    public async Task SimpleExpensesAndDashboardReflectRealMoneyMovement()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);
        await service.CreateSaleAsync(tenantId, "sale-dashboard", new(customerId, [new(productId, 1m, 500m)], 200m, "Cash"));
        var supplier = await service.CreateSupplierAsync(tenantId, new("Supplier", null, null, null, null));
        await service.CreatePurchaseAsync(tenantId, "purchase-dashboard", new(supplier.Data!.Id, [new("Stock", "kg", 1m, 300m)], 100m, "Cash"));
        var expenseRequest = new CreateBusinessExpenseRequest("Transportation", 50m, DateTime.UtcNow, "Delivery");
        var expense = await service.CreateBusinessExpenseAsync(tenantId, "expense-1", expenseRequest);
        var replay = await service.CreateBusinessExpenseAsync(tenantId, "expense-1", expenseRequest);

        Assert.True(expense.Success);
        Assert.Equal(expense.Data!.Id, replay.Data!.Id);
        var dashboard = (await service.GetDashboardAsync(tenantId)).Data!;
        Assert.Equal(500m, dashboard.TodaySales);
        Assert.Equal(200m, dashboard.TodayPayments);
        Assert.Equal(300m, dashboard.TodayPurchases);
        Assert.Equal(100m, dashboard.TodaySupplierPayments);
        Assert.Equal(50m, dashboard.TodayExpenses);
        Assert.Equal(300m, dashboard.OutstandingCustomers);
        Assert.Equal(200m, dashboard.OutstandingSuppliers);
        Assert.Equal(5, dashboard.RecentActivity.Count);
    }

    [Fact]
    public async Task SupplierPurchaseAndExpenseDataAreTenantIsolated()
    {
        await using var db = Db();
        var (service, a) = await Setup(db);
        var (_, b) = await Setup(db);
        var supplierB = await service.CreateSupplierAsync(b, new("Private supplier", null, null, null, null));

        var crossTenant = await service.CreatePurchaseAsync(a, "cross", new(supplierB.Data!.Id, [new("Stock", "kg", 1m, 10m)]));
        await service.CreateBusinessExpenseAsync(b, "private-expense", new("Supplies", 25m));

        Assert.False(crossTenant.Success);
        Assert.False((await service.GetSupplierAsync(a, supplierB.Data.Id)).Success);
        Assert.Empty((await service.GetBusinessExpensesAsync(a, null, null, null, null)).Data!);
        Assert.Single((await service.GetBusinessExpensesAsync(b, null, null, null, null)).Data!);
    }
}
