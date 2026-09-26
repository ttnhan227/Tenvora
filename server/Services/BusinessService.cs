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
        var sku = Clean(request.Sku);
        if (sku != null && await db.Products.AnyAsync(p => p.TenantId == tenantId && p.Sku == sku))
            return ApiResult<ProductDto>.Fail("A product with this SKU already exists.");
        var product = new Product
        {
            Id = Guid.NewGuid(), TenantId = tenantId, Name = request.Name.Trim(), Sku = sku, Unit = request.Unit.Trim(),
            DefaultPrice = Money(request.DefaultPrice), Currency = await Currency(tenantId), Notes = Clean(request.Notes),
            IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
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
        var sku = Clean(request.Sku);
        if (sku != null && await db.Products.AnyAsync(p => p.TenantId == tenantId && p.Id != productId && p.Sku == sku))
            return ApiResult<ProductDto>.Fail("A product with this SKU already exists.");
        product.Name = request.Name.Trim();
        product.Sku = sku;
        product.Unit = request.Unit.Trim();
        product.DefaultPrice = Money(request.DefaultPrice);
        product.IsActive = request.IsActive;
        product.Notes = Clean(request.Notes);
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResult<ProductDto>.Ok(MapProduct(product));
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
            var unitPrice = requested.UnitPrice ?? product.DefaultPrice;
            if (unitPrice < 0 || Scale(unitPrice) > 4)
                return ApiResult<SaleSummaryDto>.Fail("Unit price cannot be negative and may have at most four decimal places.");
            var total = Money(requested.Quantity * unitPrice);
            sale.Items.Add(new SaleItem
            {
                Id = Guid.NewGuid(), TenantId = tenantId, SaleId = sale.Id, ProductId = product.Id,
                ProductName = product.Name, Unit = product.Unit, Quantity = requested.Quantity,
                UnitPrice = unitPrice, LineTotal = total, Product = product
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
        var paid = Money(sale.Payments.Sum(p => p.Amount));
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
        var paid = Money(sales.SelectMany(s => s.Payments).Sum(p => p.Amount));
        return new(customer.Id, customer.Name, customer.Phone, customer.Email, customer.Address, customer.Notes,
            customer.Status, currency, total, paid, Money(total - paid), sales.Count, customer.CreatedAt);
    }

    private static ProductDto MapProduct(Product p) =>
        new(p.Id, p.Name, p.Sku, p.Unit, p.DefaultPrice, p.Currency, p.IsActive, p.Notes, p.CreatedAt);

    private static SaleSummaryDto MapSale(Sale sale)
    {
        var paid = Money(sale.Payments.Sum(p => p.Amount));
        var outstanding = Money(sale.TotalAmount - paid);
        var paymentStatus = outstanding == 0 ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid";
        return new(sale.Id, sale.SaleNumber, sale.CustomerId, sale.Customer?.Name ?? "Customer", sale.Currency,
            sale.TotalAmount, paid, outstanding, paymentStatus, sale.Status, sale.Notes, sale.SoldAt, sale.CreatedAt,
            sale.Items.Select(i => new SaleItemDto(i.Id, i.ProductId, i.ProductName, i.Unit, i.Quantity, i.UnitPrice, i.LineTotal)).ToList(),
            sale.Payments.OrderByDescending(p => p.PaidAt).Select(p => new BusinessPaymentDto(
                p.Id, p.SaleId, sale.SaleNumber, p.CustomerId, p.Amount, p.Currency, p.Method, p.Reference, p.Notes, p.PaidAt)).ToList());
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
