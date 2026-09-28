using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed partial class BusinessService(AppDbContext db) : IBusinessService
{
    public async Task<ApiResult<List<BusinessCustomerDto>>> GetCustomersAsync(Guid tenantId, string? search, string? status)
    {
        var query = db.Customers.AsNoTracking().Where(c => c.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.ToLower().Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(c => c.Status == status);

        var currency = await Currency(tenantId);
        var customers = await query.Include(c => c.Sales).ThenInclude(s => s.Payments)
            .OrderBy(c => c.Name).ToListAsync();
        return ApiResult<List<BusinessCustomerDto>>.Ok(customers.Select(c => MapCustomer(c, currency)).ToList());
    }

    public async Task<ApiResult<BusinessCustomerDetailDto>> GetCustomerAsync(Guid tenantId, Guid customerId)
    {
        var customer = await db.Customers.AsNoTracking()
            .Include(c => c.Sales).ThenInclude(s => s.Items)
            .Include(c => c.Sales).ThenInclude(s => s.Payments)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == customerId);
        if (customer == null) return ApiResult<BusinessCustomerDetailDto>.Fail("Customer not found.");
        var currency = await Currency(tenantId);
        var sales = customer.Sales.OrderByDescending(s => s.SoldAt).Select(MapSale).ToList();
        var payments = sales.SelectMany(s => s.Payments).OrderByDescending(p => p.PaidAt).ToList();
        return ApiResult<BusinessCustomerDetailDto>.Ok(new(MapCustomer(customer, currency), sales, payments));
    }

    public async Task<ApiResult<BusinessCustomerDto>> CreateCustomerAsync(Guid tenantId, CreateBusinessCustomerRequest request)
    {
        var name = request.Name.Trim();
        if (name.Length == 0) return ApiResult<BusinessCustomerDto>.Fail("Customer name is required.");
        var customer = new Customer
        {
            Id = Guid.NewGuid(), TenantId = tenantId, Name = name, Phone = Clean(request.Phone),
            Email = Clean(request.Email)?.ToLowerInvariant(), Address = Clean(request.Address), Notes = Clean(request.Notes),
            Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        return ApiResult<BusinessCustomerDto>.Ok(MapCustomer(customer, await Currency(tenantId)));
    }

    public async Task<ApiResult<BusinessCustomerDto>> UpdateCustomerAsync(Guid tenantId, Guid customerId, UpdateBusinessCustomerRequest request)
    {
        var customer = await db.Customers.Include(c => c.Sales).ThenInclude(s => s.Payments)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == customerId);
        if (customer == null) return ApiResult<BusinessCustomerDto>.Fail("Customer not found.");
        var name = request.Name.Trim();
        if (name.Length == 0) return ApiResult<BusinessCustomerDto>.Fail("Customer name is required.");
        if (request.Status is not ("Active" or "Archived")) return ApiResult<BusinessCustomerDto>.Fail("Choose Active or Archived.");
        customer.Name = name;
        customer.Phone = Clean(request.Phone);
        customer.Email = Clean(request.Email)?.ToLowerInvariant();
        customer.Address = Clean(request.Address);
        customer.Notes = Clean(request.Notes);
        customer.Status = request.Status;
        customer.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResult<BusinessCustomerDto>.Ok(MapCustomer(customer, await Currency(tenantId)));
    }

    public async Task<ApiResult<List<ProductDto>>> GetProductsAsync(Guid tenantId, string? search, bool? active)
    {
        var query = db.Products.AsNoTracking().Where(p => p.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(term) || (p.Sku != null && p.Sku.ToLower().Contains(term)));
        }
        if (active.HasValue) query = query.Where(p => p.IsActive == active.Value);
        var products = await query.OrderBy(p => p.Name).ToListAsync();
        return ApiResult<List<ProductDto>>.Ok(products.Select(MapProduct).ToList());
    }

    public async Task<ApiResult<ProductDto>> GetProductAsync(Guid tenantId, Guid productId)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == productId);
        return product == null ? ApiResult<ProductDto>.Fail("Product not found.") : ApiResult<ProductDto>.Ok(MapProduct(product));
    }

    public async Task<ApiResult<ProductDto>> CreateProductAsync(Guid tenantId, CreateProductRequest request)
    {
        var validation = ValidateProduct(request.Name, request.Unit, request.DefaultPrice);
        if (validation != null) return ApiResult<ProductDto>.Fail(validation);
        if (request.CostPrice < 0 || Scale(request.CostPrice) > 4) return ApiResult<ProductDto>.Fail("Cost price cannot be negative.");
        var sku = Clean(request.Sku);
        if (sku != null && await db.Products.AnyAsync(p => p.TenantId == tenantId && p.Sku == sku))
            return ApiResult<ProductDto>.Fail("A product with this SKU already exists.");
        var trackInventory = request.TrackInventory || request.StockQuantity > 0 || request.MinStockLevel.HasValue;
        var product = new Product
        {
            Id = Guid.NewGuid(), TenantId = tenantId, Name = request.Name.Trim(), Sku = sku, Unit = request.Unit.Trim(),
            DefaultPrice = Money(request.DefaultPrice), CostPrice = Money(request.CostPrice),
            StockQuantity = Money(request.StockQuantity), MinStockLevel = request.MinStockLevel.HasValue ? Money(request.MinStockLevel.Value) : null,
            Currency = await Currency(tenantId), Notes = Clean(request.Notes),
            IsActive = true, TrackInventory = trackInventory,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return ApiResult<ProductDto>.Ok(MapProduct(product));
    }

    public async Task<ApiResult<ProductDto>> UpdateProductAsync(Guid tenantId, Guid productId, UpdateProductRequest request)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == productId);
        if (product == null) return ApiResult<ProductDto>.Fail("Product not found.");
        var validation = ValidateProduct(request.Name, request.Unit, request.DefaultPrice);
        if (validation != null) return ApiResult<ProductDto>.Fail(validation);
        if (request.CostPrice.HasValue && (request.CostPrice.Value < 0 || Scale(request.CostPrice.Value) > 4)) return ApiResult<ProductDto>.Fail("Cost price cannot be negative.");
        if (request.MinStockLevel.HasValue && (request.MinStockLevel.Value < 0 || Scale(request.MinStockLevel.Value) > 4)) return ApiResult<ProductDto>.Fail("Minimum stock level cannot be negative.");
        var sku = Clean(request.Sku);
        if (sku != null && await db.Products.AnyAsync(p => p.TenantId == tenantId && p.Id != productId && p.Sku == sku))
            return ApiResult<ProductDto>.Fail("A product with this SKU already exists.");
        product.Name = request.Name.Trim();
        product.Sku = sku;
        product.Unit = request.Unit.Trim();
        product.DefaultPrice = Money(request.DefaultPrice);
        if (request.CostPrice.HasValue) product.CostPrice = Money(request.CostPrice.Value);
        // Direct stock mutation is prohibited; all adjustments are recorded via CreateStockAdjustmentAsync.
        product.MinStockLevel = request.MinStockLevel.HasValue ? Money(request.MinStockLevel.Value) : null;
        product.IsActive = request.IsActive;
        if (request.TrackInventory.HasValue) product.TrackInventory = request.TrackInventory.Value;
        product.Notes = Clean(request.Notes);
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResult<ProductDto>.Ok(MapProduct(product));
    }

    public async Task<ApiResult<ProductDeletionResultDto>> DeleteProductAsync(Guid tenantId, Guid productId)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == productId);
        if (product == null) return ApiResult<ProductDeletionResultDto>.Fail("Product not found.");

        var hasHistory = await db.SaleItems.AnyAsync(i => i.TenantId == tenantId && i.ProductId == productId)
            || await db.PurchaseItems.AnyAsync(i => i.TenantId == tenantId && i.ProductId == productId)
            || await db.StockAdjustments.AnyAsync(a => a.TenantId == tenantId && a.ProductId == productId);

        if (hasHistory)
        {
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return ApiResult<ProductDeletionResultDto>.Ok(
                new(product.Id, product.Name, DeletedPermanently: false, Archived: true),
                "Product archived because it is linked to financial or inventory history.");
        }

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return ApiResult<ProductDeletionResultDto>.Ok(
            new(product.Id, product.Name, DeletedPermanently: true, Archived: false),
            "Product deleted permanently.");
    }

    public async Task<ApiResult<List<SaleSummaryDto>>> GetSalesAsync(Guid tenantId, string? search, Guid? customerId, DateTime? from, DateTime? to)
    {
        var query = db.Sales.AsNoTracking().Where(s => s.TenantId == tenantId)
            .Include(s => s.Customer).Include(s => s.Items).Include(s => s.Payments).AsQueryable();
        if (customerId.HasValue) query = query.Where(s => s.CustomerId == customerId.Value);
        if (from.HasValue) query = query.Where(s => s.SoldAt >= Utc(from.Value));
        if (to.HasValue) query = query.Where(s => s.SoldAt < Utc(to.Value.Date.AddDays(1)));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.SaleNumber.ToLower().Contains(term) ||
                (s.Customer != null && s.Customer.Name.ToLower().Contains(term)) ||
                s.Items.Any(i => i.ProductName.ToLower().Contains(term)));
        }
        var sales = await query.OrderByDescending(s => s.SoldAt).ThenByDescending(s => s.CreatedAt).ToListAsync();
        return ApiResult<List<SaleSummaryDto>>.Ok(sales.Select(MapSale).ToList());
    }

    public async Task<ApiResult<SaleSummaryDto>> GetSaleAsync(Guid tenantId, Guid saleId)
    {
        var sale = await FindSale(tenantId, saleId, true);
        return sale == null ? ApiResult<SaleSummaryDto>.Fail("Sale not found.") : ApiResult<SaleSummaryDto>.Ok(MapSale(sale));
    }

    public async Task<ApiResult<SaleSummaryDto>> CreateSaleAsync(Guid tenantId, string idempotencyKey, CreateSaleRequest request)
    {
        var keyError = ValidateKey(idempotencyKey);
        if (keyError != null) return ApiResult<SaleSummaryDto>.Fail(keyError);
        if (request.Items == null || request.Items.Count == 0) return ApiResult<SaleSummaryDto>.Fail("Add at least one sale item.");
        if (request.Items.Select(i => i.ProductId).Distinct().Count() != request.Items.Count)
            return ApiResult<SaleSummaryDto>.Fail("Add each product only once per sale.");

        var requestHash = Hash(request);
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.Sales.AsNoTracking().FirstOrDefaultAsync(s => s.TenantId == tenantId && s.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != requestHash) return ApiResult<SaleSummaryDto>.Fail("This idempotency key was already used for a different sale.");
            var replay = await FindSale(tenantId, existing.Id, true);
            if (write != null) await write.CommitAsync();
            return ApiResult<SaleSummaryDto>.Ok(MapSale(replay!));
        }

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.CustomerId && c.Status == "Active");
        if (customer == null) return ApiResult<SaleSummaryDto>.Fail("Choose an active customer in this business.");
        var productIds = request.Items.Select(i => i.ProductId).ToList();
        var products = await db.Products.Where(p => p.TenantId == tenantId && productIds.Contains(p.Id) && p.IsActive).ToListAsync();
        if (products.Count != productIds.Count) return ApiResult<SaleSummaryDto>.Fail("One or more products are unavailable in this business.");
        var currency = await Currency(tenantId);
        if (products.Any(p => p.Currency != currency)) return ApiResult<SaleSummaryDto>.Fail("All products must use the business currency.");

        var soldAt = Utc(request.SoldAt ?? DateTime.UtcNow);
        var dayStart = soldAt.Date;
        var next = await db.Sales.CountAsync(s => s.TenantId == tenantId && s.SoldAt >= dayStart && s.SoldAt < dayStart.AddDays(1)) + 1;
        var sale = new Sale
        {
            Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = customer.Id,
            SaleNumber = $"SALE-{soldAt:yyyyMMdd}-{next:D4}", Currency = currency, Status = SaleStatuses.Posted,
            Notes = Clean(request.Notes), IdempotencyKey = idempotencyKey, RequestHash = requestHash,
            SoldAt = soldAt, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Customer = customer
        };
        foreach (var requested in request.Items)
        {
            if (requested.Quantity <= 0 || Scale(requested.Quantity) > 4)
                return ApiResult<SaleSummaryDto>.Fail("Quantity must be positive and may have at most four decimal places.");
            var product = products.Single(p => p.Id == requested.ProductId);
            if (product.TrackInventory && product.StockQuantity < requested.Quantity)
                return ApiResult<SaleSummaryDto>.Fail($"Insufficient stock for '{product.Name}'. Available: {product.StockQuantity:0.####}, Requested: {requested.Quantity:0.####}.");
        }
        foreach (var requested in request.Items)
        {
            var product = products.Single(p => p.Id == requested.ProductId);
            if (product.TrackInventory)
            {
                product.StockQuantity = Money(product.StockQuantity - requested.Quantity);
                product.UpdatedAt = DateTime.UtcNow;
            }
            var unitPrice = requested.UnitPrice ?? product.DefaultPrice;
            if (unitPrice < 0 || Scale(unitPrice) > 4)
                return ApiResult<SaleSummaryDto>.Fail("Unit price cannot be negative and may have at most four decimal places.");
            var total = Money(requested.Quantity * unitPrice);
            sale.Items.Add(new SaleItem
            {
                Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale.Id, ProductId = product.Id,
                ProductName = product.Name, Unit = product.Unit, Quantity = requested.Quantity,
                UnitPrice = unitPrice, UnitCost = product.CostPrice, LineTotal = total, Product = product
            });
        }
        sale.TotalAmount = Money(sale.Items.Sum(i => i.LineTotal));
        if (sale.TotalAmount <= 0) return ApiResult<SaleSummaryDto>.Fail("Sale total must be greater than zero.");
        if (request.PaymentAmount < 0 || request.PaymentAmount > sale.TotalAmount || Scale(request.PaymentAmount) > 4)
            return ApiResult<SaleSummaryDto>.Fail("Initial payment cannot be negative or exceed the sale total.");
        if (request.PaymentAmount > 0)
        {
            sale.Payments.Add(new Payment
            {
                Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale.Id, CustomerId = customer.Id,
                Amount = Money(request.PaymentAmount), Currency = currency, Method = NormalizeMethod(request.PaymentMethod),
                IdempotencyKey = $"{sale.Id:N}:initial", RequestHash = requestHash,
                PaidAt = soldAt, CreatedAt = DateTime.UtcNow, Customer = customer
            });
        }
        db.Sales.Add(sale);
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<SaleSummaryDto>.Ok(MapSale(sale));
    }

    public async Task<ApiResult<CustomerAccountPaymentResultDto>> RecordCustomerAccountPaymentAsync(
        Guid tenantId, Guid customerId, string idempotencyKey, RecordCustomerAccountPaymentRequest request)
    {
        var keyError = ValidateKey(idempotencyKey);
        if (keyError != null) return ApiResult<CustomerAccountPaymentResultDto>.Fail(keyError);
        if (request.Amount <= 0 || Scale(request.Amount) > 4)
            return ApiResult<CustomerAccountPaymentResultDto>.Fail("Payment amount must be positive with at most four decimal places.");

        var requestHash = Hash(new { customerId, request.Amount, request.Method, request.Reference, request.Notes, request.PaidAt });
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == customerId && c.Status == "Active");
        if (customer == null) return ApiResult<CustomerAccountPaymentResultDto>.Fail("Customer not found.");

        var openSales = await db.Sales
            .Where(s => s.TenantId == tenantId && s.CustomerId == customerId && s.Status == SaleStatuses.Posted)
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .OrderBy(s => s.SoldAt)
            .ThenBy(s => s.CreatedAt)
            .ToListAsync();

        var unpaidSales = openSales.Where(s => Money(s.TotalAmount - s.Payments.Where(p => !p.IsReversed).Sum(p => p.Amount)) > 0).ToList();
        var totalOutstanding = Money(unpaidSales.Sum(s => s.TotalAmount - s.Payments.Where(p => !p.IsReversed).Sum(p => p.Amount)));
        if (totalOutstanding <= 0)
            return ApiResult<CustomerAccountPaymentResultDto>.Fail("Customer does not have any outstanding balance.");

        if (request.Amount > totalOutstanding)
            return ApiResult<CustomerAccountPaymentResultDto>.Fail($"Payment amount cannot exceed the total outstanding balance of {totalOutstanding}.");

        var remainingToAllocate = Money(request.Amount);
        var paidAt = Utc(request.PaidAt ?? DateTime.UtcNow);
        var affectedSales = new List<SaleSummaryDto>();
        var paymentIndex = 1;

        foreach (var sale in unpaidSales)
        {
            if (remainingToAllocate <= 0) break;

            var salePaid = Money(sale.Payments.Where(p => !p.IsReversed).Sum(p => p.Amount));
            var saleRemaining = Money(sale.TotalAmount - salePaid);
            var paymentPortion = Math.Min(remainingToAllocate, saleRemaining);

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SaleId = sale.Id,
                CustomerId = customer.Id,
                Amount = Money(paymentPortion),
                Currency = sale.Currency,
                Method = NormalizeMethod(request.Method),
                Reference = Clean(request.Reference) ?? $"Account Payment ({sale.SaleNumber})",
                Notes = Clean(request.Notes),
                IdempotencyKey = $"{idempotencyKey}:{paymentIndex++}",
                RequestHash = requestHash,
                PaidAt = paidAt,
                CreatedAt = DateTime.UtcNow,
                Customer = customer,
                Sale = sale
            };

            sale.Payments.Add(payment);
            db.BusinessPayments.Add(payment);
            sale.UpdatedAt = DateTime.UtcNow;

            remainingToAllocate = Money(remainingToAllocate - paymentPortion);
            affectedSales.Add(MapSale(sale));
        }

        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();

        var newTotalOutstanding = Money(totalOutstanding - request.Amount);
        return ApiResult<CustomerAccountPaymentResultDto>.Ok(new(
            TotalAmountPaid: Money(request.Amount),
            TotalAllocated: Money(request.Amount - remainingToAllocate),
            RemainingBalance: newTotalOutstanding,
            AffectedSales: affectedSales
        ));
    }

    public async Task<ApiResult<SaleSummaryDto>> RecordPaymentAsync(Guid tenantId, Guid saleId, string idempotencyKey, RecordBusinessPaymentRequest request)
    {
        var keyError = ValidateKey(idempotencyKey);
        if (keyError != null) return ApiResult<SaleSummaryDto>.Fail(keyError);
        var requestHash = Hash(new { saleId, request.Amount, request.Method, request.Reference, request.Notes, request.PaidAt });
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.BusinessPayments.AsNoTracking().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != requestHash) return ApiResult<SaleSummaryDto>.Fail("This idempotency key was already used for a different payment.");
            var replay = await FindSale(tenantId, existing.SaleId, true);
            if (write != null) await write.CommitAsync();
            return ApiResult<SaleSummaryDto>.Ok(MapSale(replay!));
        }
        var sale = await FindSale(tenantId, saleId, false);
        if (sale == null) return ApiResult<SaleSummaryDto>.Fail("Sale not found.");
        if (sale.Status != SaleStatuses.Posted) return ApiResult<SaleSummaryDto>.Fail("This sale cannot receive payments.");
        var paid = Money(sale.Payments.Where(p => !p.IsReversed).Sum(p => p.Amount));
        var remaining = Money(sale.TotalAmount - paid);
        if (request.Amount <= 0 || request.Amount > remaining || Scale(request.Amount) > 4)
            return ApiResult<SaleSummaryDto>.Fail("Payment must be positive, may have at most four decimal places, and cannot exceed the outstanding balance.");
        var payment = new Payment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale.Id, CustomerId = sale.CustomerId,
            Amount = Money(request.Amount), Currency = sale.Currency, Method = NormalizeMethod(request.Method),
            Reference = Clean(request.Reference), Notes = Clean(request.Notes), IdempotencyKey = idempotencyKey,
            RequestHash = requestHash, PaidAt = Utc(request.PaidAt ?? DateTime.UtcNow), CreatedAt = DateTime.UtcNow,
            Customer = sale.Customer
        };
        sale.Payments.Add(payment);
        db.BusinessPayments.Add(payment);
        sale.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<SaleSummaryDto>.Ok(MapSale(sale));
    }

    public async Task<ApiResult<SaleSummaryDto>> ReverseSalePaymentAsync(
        Guid tenantId, Guid saleId, Guid paymentId, Guid? userId, ReversePaymentRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var sale = await FindSale(tenantId, saleId, false);
        if (sale == null) return ApiResult<SaleSummaryDto>.Fail("Sale not found.");
        var payment = sale.Payments.FirstOrDefault(p => p.Id == paymentId);
        if (payment == null) return ApiResult<SaleSummaryDto>.Fail("Payment not found on this sale.");
        if (payment.IsReversed) return ApiResult<SaleSummaryDto>.Fail("This payment has already been reversed.");

        payment.IsReversed = true;
        payment.ReversedAt = DateTime.UtcNow;
        payment.ReversedByUserId = userId;
        payment.ReversalReason = Clean(request.Reason) ?? "Payment reversed by user";
        sale.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<SaleSummaryDto>.Ok(MapSale(sale));
    }

    public async Task<ApiResult<SaleSummaryDto>> VoidSaleAsync(
        Guid tenantId, Guid saleId, Guid? userId = null, VoidSaleRequest? request = null)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var sale = await FindSale(tenantId, saleId, false);
        if (sale == null) return ApiResult<SaleSummaryDto>.Fail("Sale not found.");
        if (sale.Status == SaleStatuses.Voided) return ApiResult<SaleSummaryDto>.Ok(MapSale(sale));

        var activePayments = sale.Payments.Where(p => !p.IsReversed).ToList();
        if (activePayments.Count > 0)
        {
            if (request == null || !request.ReversePayments)
                return ApiResult<SaleSummaryDto>.Fail("A sale with active payments cannot be voided. Reverse the payments first, or confirm void with payment reversal.");

            foreach (var payment in activePayments)
            {
                payment.IsReversed = true;
                payment.ReversedAt = DateTime.UtcNow;
                payment.ReversedByUserId = userId;
                payment.ReversalReason = Clean(request.Reason) ?? $"Reversed due to voiding sale {sale.SaleNumber}";
            }
        }

        var productIds = sale.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await db.Products.Where(p => p.TenantId == tenantId && productIds.Contains(p.Id)).ToListAsync();
        foreach (var item in sale.Items)
        {
            var product = products.FirstOrDefault(p => p.Id == item.ProductId);
            if (product != null && product.TrackInventory)
            {
                product.StockQuantity = Money(product.StockQuantity + item.Quantity);
                product.UpdatedAt = DateTime.UtcNow;
            }
        }

        sale.Status = SaleStatuses.Voided;
        sale.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<SaleSummaryDto>.Ok(MapSale(sale));
    }

    public async Task<ApiResult<CustomerStatementDto>> GetCustomerStatementAsync(
        Guid tenantId, Guid customerId, DateTime? from, DateTime? to)
    {
        var customer = await db.Customers.AsNoTracking()
            .Include(c => c.Sales).ThenInclude(s => s.Payments)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == customerId);
        if (customer == null) return ApiResult<CustomerStatementDto>.Fail("Customer not found.");

        var currency = await Currency(tenantId);
        var customerDto = MapCustomer(customer, currency);

        var fromUtc = from.HasValue ? Utc(from.Value.Date) : (DateTime?)null;
        var toUtc = to.HasValue ? Utc(to.Value.Date.AddDays(1)) : (DateTime?)null;

        var allEvents = new List<(DateTime Date, string Type, string Reference, decimal Debit, decimal Credit, string? Notes, bool IsReversed)>();

        foreach (var sale in customer.Sales.Where(s => s.Status == SaleStatuses.Posted))
        {
            allEvents.Add((sale.SoldAt, "Sale", sale.SaleNumber, sale.TotalAmount, 0m, sale.Notes, false));
            foreach (var payment in sale.Payments)
            {
                allEvents.Add((payment.PaidAt, "Payment", $"{sale.SaleNumber} ({payment.Method})", 0m, payment.Amount, payment.Notes, payment.IsReversed));
                if (payment.IsReversed)
                {
                    allEvents.Add((payment.ReversedAt ?? payment.PaidAt, "Payment reversal", $"{sale.SaleNumber} (Reversal)", payment.Amount, 0m, payment.ReversalReason ?? "Payment reversed", true));
                }
            }
        }

        var sorted = allEvents.OrderBy(e => e.Date).ToList();

        decimal openingBalance = 0m;
        var periodEntries = new List<CustomerStatementEntryDto>();
        decimal currentBalance = 0m;
        decimal totalDebits = 0m;
        decimal totalCredits = 0m;

        foreach (var ev in sorted)
        {
            if (fromUtc.HasValue && ev.Date < fromUtc.Value)
            {
                openingBalance = Money(openingBalance + ev.Debit - ev.Credit);
                currentBalance = openingBalance;
            }
            else if (!toUtc.HasValue || ev.Date < toUtc.Value)
            {
                currentBalance = Money(currentBalance + ev.Debit - ev.Credit);
                totalDebits = Money(totalDebits + ev.Debit);
                totalCredits = Money(totalCredits + ev.Credit);
                periodEntries.Add(new CustomerStatementEntryDto(
                    ev.Date,
                    ev.Type,
                    ev.Reference,
                    ev.Debit,
                    ev.Credit,
                    currentBalance,
                    ev.Notes,
                    ev.IsReversed
                ));
            }
        }

        var closingBalance = periodEntries.Count > 0 ? currentBalance : openingBalance;

        return ApiResult<CustomerStatementDto>.Ok(new CustomerStatementDto(
            customerDto,
            fromUtc,
            toUtc,
            openingBalance,
            totalDebits,
            totalCredits,
            closingBalance,
            periodEntries
        ));
    }

    private async Task<Sale?> FindSale(Guid tenantId, Guid saleId, bool noTracking)
    {
        var query = db.Sales.Where(s => s.TenantId == tenantId && s.Id == saleId)
            .Include(s => s.Customer).Include(s => s.Items).Include(s => s.Payments).AsQueryable();
        return await (noTracking ? query.AsNoTracking() : query).FirstOrDefaultAsync();
    }

    private async Task<string> Currency(Guid tenantId) =>
        (await db.Tenants.AsNoTracking().Where(t => t.Id == tenantId).Select(t => t.BaseCurrency).FirstOrDefaultAsync())?.ToUpperInvariant() ?? "USD";

    private static BusinessCustomerDto MapCustomer(Customer customer, string currency)
    {
        var sales = customer.Sales.Where(s => s.Status == SaleStatuses.Posted).ToList();
        var total = Money(sales.Sum(s => s.TotalAmount));
        var paid = Money(sales.SelectMany(s => s.Payments).Where(p => !p.IsReversed).Sum(p => p.Amount));
        return new(customer.Id, customer.Name, customer.Phone, customer.Email, customer.Address, customer.Notes,
            customer.Status, currency, total, paid, Money(total - paid), sales.Count, customer.CreatedAt);
    }

    private static ProductDto MapProduct(Product p) =>
        new(p.Id, p.Name, p.Sku, p.Unit, p.DefaultPrice, p.CostPrice, p.StockQuantity, p.MinStockLevel, p.Currency, p.IsActive, p.Notes, p.CreatedAt, p.TrackInventory);

    private static SaleSummaryDto MapSale(Sale sale)
    {
        var activePayments = sale.Payments.Where(p => !p.IsReversed).ToList();
        var paid = Money(activePayments.Sum(p => p.Amount));
        var outstanding = sale.Status == SaleStatuses.Voided ? 0m : Money(sale.TotalAmount - paid);
        var paymentStatus = sale.Status == SaleStatuses.Voided ? "Voided" : outstanding == 0 ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid";
        return new(sale.Id, sale.SaleNumber, sale.CustomerId, sale.Customer?.Name ?? "Customer", sale.Currency,
            sale.TotalAmount, paid, outstanding, paymentStatus, sale.Status, sale.Notes, sale.SoldAt, sale.CreatedAt,
            sale.Items.Select(i => new SaleItemDto(i.Id, i.ProductId, i.ProductName, i.Unit, i.Quantity, i.UnitPrice, i.LineTotal, i.UnitCost)).ToList(),
            sale.Payments.OrderByDescending(p => p.PaidAt).Select(p => new BusinessPaymentDto(
                p.Id, p.SaleId, sale.SaleNumber, p.CustomerId, p.Amount, p.Currency, p.Method, p.Reference, p.Notes, p.PaidAt,
                p.IsReversed, p.ReversedAt, p.ReversalReason)).ToList());
    }

    private static string? ValidateProduct(string name, string unit, decimal price)
    {
        if (string.IsNullOrWhiteSpace(name)) return "Product name is required.";
        if (string.IsNullOrWhiteSpace(unit)) return "Unit is required.";
        if (price < 0 || Scale(price) > 4) return "Default price cannot be negative and may have at most four decimal places.";
        return null;
    }

    private static string? ValidateKey(string key) => string.IsNullOrWhiteSpace(key) || key.Trim().Length > 100
        ? "Provide an Idempotency-Key header up to 100 characters."
        : null;
    private static string NormalizeMethod(string? method) => string.IsNullOrWhiteSpace(method) ? "Other" : method.Trim();
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static DateTime Utc(DateTime value) => value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    private static int Scale(decimal value) => (decimal.GetBits(value)[3] >> 16) & 0x7F;
    private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value))));
}
