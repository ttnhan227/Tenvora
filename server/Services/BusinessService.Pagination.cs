using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed partial class BusinessService
{
    public async Task<ApiResult<PagedResult<BusinessCustomerDto>>> GetCustomersPagedAsync(
        Guid tenantId, string? search, string? status, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Customers.AsNoTracking().Where(c => c.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.ToLower().Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(c => c.Status == status);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var currency = await Currency(tenantId);
        var customers = await query.Include(c => c.Sales).ThenInclude(s => s.Payments)
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var mapped = customers.Select(c => MapCustomer(c, currency)).ToList();
        return ApiResult<PagedResult<BusinessCustomerDto>>.Ok(
            new PagedResult<BusinessCustomerDto>(mapped, totalCount, page, pageSize, totalPages));
    }

    public async Task<ApiResult<PagedResult<ProductDto>>> GetProductsPagedAsync(
        Guid tenantId, string? search, bool? active, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Products.AsNoTracking().Where(p => p.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(term) || (p.Sku != null && p.Sku.ToLower().Contains(term)));
        }
        if (active.HasValue) query = query.Where(p => p.IsActive == active.Value);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var products = await query.OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var mapped = products.Select(MapProduct).ToList();
        return ApiResult<PagedResult<ProductDto>>.Ok(
            new PagedResult<ProductDto>(mapped, totalCount, page, pageSize, totalPages));
    }

    public async Task<ApiResult<PagedResult<SaleSummaryDto>>> GetSalesPagedAsync(
        Guid tenantId, string? search, Guid? customerId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Sales.AsNoTracking().Where(s => s.TenantId == tenantId);
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

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var sales = await query
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .OrderByDescending(s => s.SoldAt)
            .ThenByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var mapped = sales.Select(MapSale).ToList();
        return ApiResult<PagedResult<SaleSummaryDto>>.Ok(
            new PagedResult<SaleSummaryDto>(mapped, totalCount, page, pageSize, totalPages));
    }

    public async Task<ApiResult<PagedResult<PurchaseDto>>> GetPurchasesPagedAsync(
        Guid tenantId, string? search, Guid? supplierId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Purchases.AsNoTracking().Where(p => p.TenantId == tenantId);
        if (supplierId.HasValue) query = query.Where(p => p.SupplierId == supplierId);
        if (from.HasValue) query = query.Where(p => p.PurchasedAt >= Utc(from.Value));
        if (to.HasValue) query = query.Where(p => p.PurchasedAt < Utc(to.Value.Date.AddDays(1)));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.PurchaseNumber.ToLower().Contains(term) ||
                (p.Supplier != null && p.Supplier.Name.ToLower().Contains(term)) ||
                p.Items.Any(i => i.Description.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var purchases = await query
            .Include(p => p.Supplier)
            .Include(p => p.Items)
            .Include(p => p.Payments)
            .OrderByDescending(p => p.PurchasedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var mapped = purchases.Select(MapPurchase).ToList();
        return ApiResult<PagedResult<PurchaseDto>>.Ok(
            new PagedResult<PurchaseDto>(mapped, totalCount, page, pageSize, totalPages));
    }

    public async Task<ApiResult<PagedResult<BusinessExpenseDto>>> GetBusinessExpensesPagedAsync(
        Guid tenantId, string? search, string? category, DateTime? from, DateTime? to, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.BusinessExpenses.AsNoTracking().Where(e => e.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e => (e.Description != null && e.Description.ToLower().Contains(term)) || e.Category.ToLower().Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (from.HasValue) query = query.Where(e => e.ExpenseDate >= Utc(from.Value));
        if (to.HasValue) query = query.Where(e => e.ExpenseDate < Utc(to.Value.Date.AddDays(1)));

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var expenses = await query
            .OrderByDescending(e => e.ExpenseDate)
            .ThenByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var mapped = expenses.Select(MapExpense).ToList();
        return ApiResult<PagedResult<BusinessExpenseDto>>.Ok(
            new PagedResult<BusinessExpenseDto>(mapped, totalCount, page, pageSize, totalPages));
    }

    public async Task<ApiResult<PagedResult<SupplierDto>>> GetSuppliersPagedAsync(
        Guid tenantId, string? search, string? status, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Suppliers.AsNoTracking().Where(s => s.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) ||
                (s.Phone != null && s.Phone.ToLower().Contains(term)) ||
                (s.Email != null && s.Email.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(s => s.Status == status);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var currency = await Currency(tenantId);
        var suppliers = await query.Include(s => s.Purchases).ThenInclude(p => p.Payments)
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var mapped = suppliers.Select(s => MapSupplier(s, currency)).ToList();
        return ApiResult<PagedResult<SupplierDto>>.Ok(
            new PagedResult<SupplierDto>(mapped, totalCount, page, pageSize, totalPages));
    }
}
