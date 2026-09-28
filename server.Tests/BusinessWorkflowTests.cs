using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Tenvora.Api.Data;
using Tenvora.Api.Controllers;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Tenvora.Api.Domain.Entities;
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

    [Fact]
    public async Task InventoryAndCostTrackingUpdatesAcrossSalesPurchasesAndVoids()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var productRes = await service.CreateProductAsync(tenantId,
            new("Widget A", "WID-A", "unit", 100m, "Initial stock", CostPrice: 50m, StockQuantity: 10m, MinStockLevel: 5m));
        Assert.True(productRes.Success);
        var productId = productRes.Data!.Id;
        Assert.Equal(10m, productRes.Data.StockQuantity);
        Assert.Equal(50m, productRes.Data.CostPrice);

        var customer = await service.CreateCustomerAsync(tenantId, new("Customer X", "0123456789", null, null, null));
        var saleRes = await service.CreateSaleAsync(tenantId, "sale-inv-1",
            new(customer.Data!.Id, [new(productId, 4m, 100m)]));
        Assert.True(saleRes.Success);

        var afterSale = await service.GetProductAsync(tenantId, productId);
        Assert.Equal(6m, afterSale.Data!.StockQuantity);

        var supplier = await service.CreateSupplierAsync(tenantId, new("Supplier Y", null, null, null, null));
        var purchaseRes = await service.CreatePurchaseAsync(tenantId, "purch-inv-1",
            new(supplier.Data!.Id, [new("Widget A", "unit", 10m, 60m, ProductId: productId)]));
        Assert.True(purchaseRes.Success);

        var afterPurchase = await service.GetProductAsync(tenantId, productId);
        Assert.Equal(16m, afterPurchase.Data!.StockQuantity);
        Assert.Equal(60m, afterPurchase.Data.CostPrice);

        var voidRes = await service.VoidSaleAsync(tenantId, saleRes.Data!.Id);
        Assert.True(voidRes.Success);

        var afterVoid = await service.GetProductAsync(tenantId, productId);
        Assert.Equal(20m, afterVoid.Data!.StockQuantity);
    }

    [Fact]
    public async Task CustomerAccountPaymentAllocatesViaFifo()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var customer = await service.CreateCustomerAsync(tenantId, new("Debt Customer", "0999999999", null, null, null));
        var product = await service.CreateProductAsync(tenantId, new("Item", null, "pc", 10m, null));
        var custId = customer.Data!.Id;
        var prodId = product.Data!.Id;

        // Sale 1: $100
        var s1 = await service.CreateSaleAsync(tenantId, "sale-fifo-1", new(custId, [new(prodId, 10m, 10m)], SoldAt: DateTime.UtcNow.AddHours(-2)));
        // Sale 2: $150
        var s2 = await service.CreateSaleAsync(tenantId, "sale-fifo-2", new(custId, [new(prodId, 15m, 10m)], SoldAt: DateTime.UtcNow.AddHours(-1)));

        var customerBefore = await service.GetCustomerAsync(tenantId, custId);
        Assert.Equal(250m, customerBefore.Data!.Customer.OutstandingBalance);

        // Pay $150 lump-sum
        var payRes = await service.RecordCustomerAccountPaymentAsync(tenantId, custId, "account-pay-1",
            new(150m, "BankTransfer", "REF-LUMP-01", "Settling older balance"));
        Assert.True(payRes.Success);
        Assert.Equal(150m, payRes.Data!.TotalAllocated);
        Assert.Equal(100m, payRes.Data.RemainingBalance);
        Assert.Equal(2, payRes.Data.AffectedSales.Count);

        // Check Sale 1 is fully paid ($100), Sale 2 has $100 remaining ($50 allocated)
        var sale1 = await service.GetSaleAsync(tenantId, s1.Data!.Id);
        var sale2 = await service.GetSaleAsync(tenantId, s2.Data!.Id);

        Assert.Equal(0m, sale1.Data!.OutstandingBalance);
        Assert.Equal(100m, sale2.Data!.OutstandingBalance);
    }

    [Fact]
    public async Task ExpenseUpdateDeleteAndDashboardPeriodMetricsWork()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var exp = await service.CreateBusinessExpenseAsync(tenantId, "exp-1", new("Utilities", 100m, ExpenseDate: DateTime.UtcNow));
        Assert.True(exp.Success);

        var updated = await service.UpdateBusinessExpenseAsync(tenantId, exp.Data!.Id,
            new("Utilities", 120m, DateTime.UtcNow, "Updated notes"));
        Assert.True(updated.Success);
        Assert.Equal(120m, updated.Data!.Amount);

        var dashMonth = await service.GetDashboardAsync(tenantId, "month");
        Assert.True(dashMonth.Success);
        Assert.Equal(120m, dashMonth.Data!.PeriodExpenses);

        var del = await service.DeleteBusinessExpenseAsync(tenantId, exp.Data.Id);
        Assert.True(del.Success);

        var list = await service.GetBusinessExpensesAsync(tenantId, null, null, null, null);
        Assert.Empty(list.Data!);
    }

    [Fact]
    public async Task NegativeStockPreventionRejectsSaleWhenStockIsInsufficient()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Stock", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId,
            new("Physical Item", "PHYS-01", "pcs", 100m, null, CostPrice: 40m, StockQuantity: 5m, TrackInventory: true))).Data!;

        // Attempt to sell 6 when stock is 5
        var failSale = await service.CreateSaleAsync(tenantId, "fail-stock-1",
            new(cust.Id, [new(prod.Id, 6m, 100m)]));
        Assert.False(failSale.Success);
        Assert.Contains("Insufficient stock", failSale.Message);

        // Sell 4 when stock is 5 -> Succeeds, stock becomes 1
        var okSale = await service.CreateSaleAsync(tenantId, "ok-stock-1",
            new(cust.Id, [new(prod.Id, 4m, 100m)]));
        Assert.True(okSale.Success);

        var afterSale = (await service.GetProductAsync(tenantId, prod.Id)).Data!;
        Assert.Equal(1m, afterSale.StockQuantity);
    }

    [Fact]
    public async Task HistoricalCogsSnapshotAndGroundedNetProfitCalculationsWork()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Profit", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId,
            new("Widget Cost", null, "pcs", 200m, null, CostPrice: 80m, StockQuantity: 10m, TrackInventory: true))).Data!;

        // Sell 2 units at $200 each (Revenue $400, COGS $160)
        var sale = (await service.CreateSaleAsync(tenantId, "sale-cogs-1",
            new(cust.Id, [new(prod.Id, 2m, 200m)], PaymentAmount: 400m))).Data!;

        Assert.Equal(80m, sale.Items[0].UnitCost);

        // Later supplier purchase or product cost changes to $100
        await service.UpdateProductAsync(tenantId, prod.Id,
            new("Widget Cost", null, "pcs", 200m, CostPrice: 100m, IsActive: true));

        // Sale item historical cost snapshot must remain $80
        var reloadedSale = (await service.GetSaleAsync(tenantId, sale.Id)).Data!;
        Assert.Equal(80m, reloadedSale.Items[0].UnitCost);

        // Add $50 expense
        await service.CreateBusinessExpenseAsync(tenantId, "exp-profit-1",
            new("Shipping", 50m, ExpenseDate: DateTime.UtcNow));

        // Dashboard profit check: Revenue ($400) - COGS ($160) - Expenses ($50) = Net Profit ($190)
        var dash = (await service.GetDashboardAsync(tenantId, "month")).Data!;
        Assert.Equal(400m, dash.PeriodSales);
        Assert.Equal(160m, dash.PeriodCogs);
        Assert.Equal(50m, dash.PeriodExpenses);
        Assert.Equal(190m, dash.PeriodNetProfit);
    }

    [Fact]
    public async Task PaymentReversalRestoresBalancesAndPreventsDoubleReversal()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Rev", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Item Rev", null, "pcs", 100m, null))).Data!;

        var sale = (await service.CreateSaleAsync(tenantId, "sale-rev-1",
            new(cust.Id, [new(prod.Id, 1m, 100m)], PaymentAmount: 40m))).Data!;

        Assert.Equal(60m, sale.OutstandingBalance);
        var paymentId = sale.Payments[0].Id;

        // Reverse the $40 payment
        var revRes = await service.ReverseSalePaymentAsync(tenantId, sale.Id, paymentId, null, new("Customer bounced check"));
        Assert.True(revRes.Success);
        Assert.Equal(100m, revRes.Data!.OutstandingBalance);
        Assert.Equal(0m, revRes.Data.PaidAmount);

        var reversedPayment = revRes.Data.Payments.First(p => p.Id == paymentId);
        Assert.True(reversedPayment.IsReversed);
        Assert.Equal("Customer bounced check", reversedPayment.ReversalReason);
        Assert.NotNull(reversedPayment.ReversedAt);

        // Customer balance should now reflect $100 owed
        var custAfter = (await service.GetCustomerAsync(tenantId, cust.Id)).Data!;
        Assert.Equal(100m, custAfter.Customer.OutstandingBalance);

        // Attempting to reverse again should fail
        var secondRev = await service.ReverseSalePaymentAsync(tenantId, sale.Id, paymentId, null, new("Double reversal attempt"));
        Assert.False(secondRev.Success);
        Assert.Contains("already been reversed", secondRev.Message);
    }

    [Fact]
    public async Task VoidSaleWithPaymentReversalsAndStockRestorationWorks()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Void", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId,
            new("Item Void", null, "pcs", 100m, null, StockQuantity: 10m, TrackInventory: true))).Data!;

        var sale = (await service.CreateSaleAsync(tenantId, "sale-to-void",
            new(cust.Id, [new(prod.Id, 3m, 100m)], PaymentAmount: 150m))).Data!;

        // Stock decreased to 7
        Assert.Equal(7m, (await service.GetProductAsync(tenantId, prod.Id)).Data!.StockQuantity);

        // Void the sale with payment reversal
        var voidRes = await service.VoidSaleAsync(tenantId, sale.Id, null,
            new VoidSaleRequest(ReversePayments: true, Reason: "Order cancelled"));
        Assert.True(voidRes.Success);
        Assert.Equal(SaleStatuses.Voided, voidRes.Data!.Status);
        Assert.Equal(0m, voidRes.Data.OutstandingBalance);

        // Stock restored back to 10
        Assert.Equal(10m, (await service.GetProductAsync(tenantId, prod.Id)).Data!.StockQuantity);

        // Attached payment is reversed
        var voidedPayment = voidRes.Data.Payments.First();
        Assert.True(voidedPayment.IsReversed);
    }

    [Fact]
    public async Task SafeVoidPurchaseRejectsWhenStockAlreadySold()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var supp = (await service.CreateSupplierAsync(tenantId, new("Supplier Safe", null, null, null, null))).Data!;
        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Safe", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId,
            new("Safe Item", null, "pcs", 100m, null, StockQuantity: 0m, TrackInventory: true))).Data!;

        // Purchase 10 units
        var purch = (await service.CreatePurchaseAsync(tenantId, "purch-safe-1",
            new(supp.Id, [new("Safe Item", "pcs", 10m, 50m, ProductId: prod.Id)]))).Data!;
        Assert.Equal(10m, (await service.GetProductAsync(tenantId, prod.Id)).Data!.StockQuantity);

        // Sell 8 units -> stock is 2
        var sale = await service.CreateSaleAsync(tenantId, "sale-safe-1",
            new(cust.Id, [new(prod.Id, 8m, 100m)]));
        Assert.True(sale.Success);
        Assert.Equal(2m, (await service.GetProductAsync(tenantId, prod.Id)).Data!.StockQuantity);

        // Void purchase attempts to return 10 units, but only 2 remain -> must be rejected
        var voidPurch = await service.VoidPurchaseAsync(tenantId, purch.Id, null,
            new VoidPurchaseRequest(ReversePayments: true, Reason: "Defective shipment"));
        Assert.False(voidPurch.Success);
        Assert.Contains("Cannot void purchase", voidPurch.Message);
        Assert.Contains("already been sold", voidPurch.Message);
    }

    [Fact]
    public async Task StockAdjustmentLifecycleAndNegativeStockPreventionWork()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var prod = (await service.CreateProductAsync(tenantId,
            new("Adj Item", null, "pcs", 50m, null, StockQuantity: 10m, TrackInventory: true))).Data!;

        // Adjust -3 (Damaged) -> stock becomes 7
        var adj1 = await service.CreateStockAdjustmentAsync(tenantId, null,
            new(prod.Id, -3m, "damaged", "Broken during unloading"));
        Assert.True(adj1.Success);
        Assert.Equal(10m, adj1.Data!.QuantityBefore);
        Assert.Equal(7m, adj1.Data.QuantityAfter);
        Assert.Equal(-3m, adj1.Data.AdjustmentQuantity);

        // Adjust +5 (Count correction) -> stock becomes 12
        var adj2 = await service.CreateStockAdjustmentAsync(tenantId, null,
            new(prod.Id, 5m, "count_correction", "Found in shelf B"));
        Assert.True(adj2.Success);
        Assert.Equal(12m, adj2.Data!.QuantityAfter);

        // Attempting to adjust -15 (Shrinkage) when only 12 in stock -> rejected
        var adjFail = await service.CreateStockAdjustmentAsync(tenantId, null,
            new(prod.Id, -15m, "shrinkage", "Theft report"));
        Assert.False(adjFail.Success);
        Assert.Contains("cannot become negative", adjFail.Message);

        // History check
        var history = await service.GetStockAdjustmentsAsync(tenantId, prod.Id);
        Assert.True(history.Success);
        Assert.Equal(2, history.Data!.Count);
    }

    [Fact]
    public async Task CustomerStatementCalculatesRunningBalancesAccurately()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        var cust = (await service.CreateCustomerAsync(tenantId, new("Customer Statement", null, null, null, null))).Data!;
        var prod = (await service.CreateProductAsync(tenantId, new("Item Stmt", null, "pcs", 100m, null))).Data!;

        // Sale 1: $200 (Paid $50) -> outstanding $150
        var s1 = (await service.CreateSaleAsync(tenantId, "sale-stmt-1",
            new(cust.Id, [new(prod.Id, 2m, 100m)], PaymentAmount: 50m, SoldAt: DateTime.UtcNow.AddDays(-2)))).Data!;

        // Later payment: $50
        await service.RecordPaymentAsync(tenantId, s1.Id, "pay-stmt-1", new(50m, "Bank transfer"));

        // Sale 2: $100 (Unpaid)
        await service.CreateSaleAsync(tenantId, "sale-stmt-2",
            new(cust.Id, [new(prod.Id, 1m, 100m)], PaymentAmount: 0m, SoldAt: DateTime.UtcNow.AddDays(-1)));

        var statement = (await service.GetCustomerStatementAsync(tenantId, cust.Id, null, null)).Data!;
        Assert.Equal(300m, statement.TotalDebits);
        Assert.Equal(100m, statement.TotalCredits);
        Assert.Equal(200m, statement.ClosingBalance);
        Assert.Equal(4, statement.Entries.Count); // Sale 1 debit ($200), Pay 1 credit ($50), Pay 2 credit ($50), Sale 2 debit ($100)
    }

    [Fact]
    public async Task ServerSidePaginationReturnsAccurateMetadata()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);

        // Seed 15 customers
        for (int i = 1; i <= 15; i++)
        {
            await service.CreateCustomerAsync(tenantId, new($"Client {i:D2}", null, null, null, null));
        }

        // Page 1, size 10
        var p1 = (await service.GetCustomersPagedAsync(tenantId, null, null, 1, 10)).Data!;
        Assert.Equal(10, p1.Items.Count);
        Assert.Equal(15, p1.TotalCount);
        Assert.Equal(2, p1.TotalPages);
        Assert.Equal(1, p1.Page);

        // Page 2, size 10
        var p2 = (await service.GetCustomersPagedAsync(tenantId, null, null, 2, 10)).Data!;
        Assert.Equal(5, p2.Items.Count);
        Assert.Equal(15, p2.TotalCount);
    }

    [Fact]
    public async Task DeleteProductPermanentlyRemovesUnusedProduct()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var product = (await service.CreateProductAsync(tenantId, new("Unused item", null, "pcs", 25m, null))).Data!;

        var result = await service.DeleteProductAsync(tenantId, product.Id);

        Assert.True(result.Success);
        Assert.True(result.Data!.DeletedPermanently);
        Assert.False(result.Data.Archived);
        Assert.Null(await db.Products.FindAsync([product.Id], TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeleteProductArchivesProductReferencedByFinancialHistory()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);
        var sale = await service.CreateSaleAsync(tenantId, "product-delete-history",
            new(customerId, [new(productId, 1m, 180_000m)]));
        Assert.True(sale.Success);

        var result = await service.DeleteProductAsync(tenantId, productId);

        Assert.True(result.Success);
        Assert.False(result.Data!.DeletedPermanently);
        Assert.True(result.Data.Archived);
        Assert.False((await db.Products.SingleAsync(p => p.Id == productId, TestContext.Current.CancellationToken)).IsActive);
        Assert.Single(await db.SaleItems.Where(i => i.ProductId == productId).ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeleteCustomerPermanentlyRemovesUnusedCustomer()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var customer = (await service.CreateCustomerAsync(tenantId, new("Unused customer", null, null, null, null))).Data!;

        var result = await service.DeleteCustomerAsync(tenantId, customer.Id);

        Assert.True(result.Success);
        Assert.True(result.Data!.DeletedPermanently);
        Assert.False(await db.Customers.AnyAsync(c => c.Id == customer.Id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeleteCustomerArchivesCustomerReferencedByFinancialHistory()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var (customerId, productId) = await SeedCustomerAndProduct(service, tenantId);
        Assert.True((await service.CreateSaleAsync(tenantId, "customer-delete-history", new(customerId, [new(productId, 1m, 10m)]))).Success);

        var result = await service.DeleteCustomerAsync(tenantId, customerId);

        Assert.True(result.Success);
        Assert.True(result.Data!.Archived);
        Assert.Equal("Archived", (await db.Customers.SingleAsync(c => c.Id == customerId, TestContext.Current.CancellationToken)).Status);
    }

    [Fact]
    public async Task DeleteSupplierPermanentlyRemovesUnusedSupplier()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var supplier = (await service.CreateSupplierAsync(tenantId, new("Unused supplier", null, null, null, null))).Data!;

        var result = await service.DeleteSupplierAsync(tenantId, supplier.Id);

        Assert.True(result.Success);
        Assert.True(result.Data!.DeletedPermanently);
        Assert.False(await db.Suppliers.AnyAsync(s => s.Id == supplier.Id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeleteSupplierArchivesSupplierReferencedByFinancialHistory()
    {
        await using var db = Db();
        var (service, tenantId) = await Setup(db);
        var supplier = (await service.CreateSupplierAsync(tenantId, new("History supplier", null, null, null, null))).Data!;
        Assert.True((await service.CreatePurchaseAsync(tenantId, "supplier-delete-history", new(supplier.Id, [new("Stock", "pcs", 1m, 10m)]))).Success);

        var result = await service.DeleteSupplierAsync(tenantId, supplier.Id);

        Assert.True(result.Success);
        Assert.True(result.Data!.Archived);
        Assert.Equal("Archived", (await db.Suppliers.SingleAsync(s => s.Id == supplier.Id, TestContext.Current.CancellationToken)).Status);
    }
}
