using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed partial class BusinessService
{
    public async Task<ApiResult<List<SupplierDto>>> GetSuppliersAsync(Guid tenantId, string? search, string? status)
    {
        var query = db.Suppliers.AsNoTracking().Where(s => s.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) ||
                (s.Phone != null && s.Phone.ToLower().Contains(term)) ||
                (s.Email != null && s.Email.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(s => s.Status == status);
        var currency = await Currency(tenantId);
        var rows = await query.Include(s => s.Purchases).ThenInclude(p => p.Payments).OrderBy(s => s.Name).ToListAsync();
        return ApiResult<List<SupplierDto>>.Ok(rows.Select(s => MapSupplier(s, currency)).ToList());
    }

    public async Task<ApiResult<SupplierDetailDto>> GetSupplierAsync(Guid tenantId, Guid supplierId)
    {
        var supplier = await db.Suppliers.AsNoTracking().Where(s => s.TenantId == tenantId && s.Id == supplierId)
            .Include(s => s.Purchases).ThenInclude(p => p.Items)
            .Include(s => s.Purchases).ThenInclude(p => p.Payments).FirstOrDefaultAsync();
        if (supplier == null) return ApiResult<SupplierDetailDto>.Fail("Supplier not found.");
        var purchases = supplier.Purchases.OrderByDescending(p => p.PurchasedAt).Select(MapPurchase).ToList();
        return ApiResult<SupplierDetailDto>.Ok(new(MapSupplier(supplier, await Currency(tenantId)), purchases,
            purchases.SelectMany(p => p.Payments).OrderByDescending(p => p.PaidAt).ToList()));
    }

    public async Task<ApiResult<SupplierDto>> CreateSupplierAsync(Guid tenantId, CreateSupplierRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return ApiResult<SupplierDto>.Fail("Supplier name is required.");
        var supplier = new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, Name = request.Name.Trim(),
            Phone = Clean(request.Phone), Email = Clean(request.Email)?.ToLowerInvariant(), Address = Clean(request.Address),
            Notes = Clean(request.Notes), Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return ApiResult<SupplierDto>.Ok(MapSupplier(supplier, await Currency(tenantId)));
    }

    public async Task<ApiResult<SupplierDto>> UpdateSupplierAsync(Guid tenantId, Guid supplierId, UpdateSupplierRequest request)
    {
        var supplier = await db.Suppliers.Include(s => s.Purchases).ThenInclude(p => p.Payments)
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == supplierId);
        if (supplier == null) return ApiResult<SupplierDto>.Fail("Supplier not found.");
        if (string.IsNullOrWhiteSpace(request.Name)) return ApiResult<SupplierDto>.Fail("Supplier name is required.");
        if (request.Status is not ("Active" or "Archived")) return ApiResult<SupplierDto>.Fail("Choose Active or Archived.");
        supplier.Name = request.Name.Trim(); supplier.Phone = Clean(request.Phone);
        supplier.Email = Clean(request.Email)?.ToLowerInvariant(); supplier.Address = Clean(request.Address);
        supplier.Notes = Clean(request.Notes); supplier.Status = request.Status; supplier.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResult<SupplierDto>.Ok(MapSupplier(supplier, await Currency(tenantId)));
    }

    public async Task<ApiResult<RecordDeletionResultDto>> DeleteSupplierAsync(Guid tenantId, Guid supplierId)
    {
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == supplierId);
        if (supplier == null) return ApiResult<RecordDeletionResultDto>.Fail("Supplier not found.");

        var hasHistory = await db.Purchases.AnyAsync(p => p.TenantId == tenantId && p.SupplierId == supplierId)
            || await db.PurchasePayments.AnyAsync(p => p.TenantId == tenantId && p.SupplierId == supplierId);

        if (hasHistory)
        {
            supplier.Status = "Archived";
            supplier.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return ApiResult<RecordDeletionResultDto>.Ok(
                new(supplier.Id, supplier.Name, DeletedPermanently: false, Archived: true),
                "Supplier archived because it is linked to financial history.");
        }

        db.Suppliers.Remove(supplier);
        await db.SaveChangesAsync();
        return ApiResult<RecordDeletionResultDto>.Ok(
            new(supplier.Id, supplier.Name, DeletedPermanently: true, Archived: false),
            "Supplier deleted permanently.");
    }

    public async Task<ApiResult<List<PurchaseDto>>> GetPurchasesAsync(Guid tenantId, string? search, Guid? supplierId, DateTime? from, DateTime? to)
    {
        var query = db.Purchases.AsNoTracking().Where(p => p.TenantId == tenantId)
            .Include(p => p.Supplier).Include(p => p.Items).Include(p => p.Payments).AsQueryable();
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
        return ApiResult<List<PurchaseDto>>.Ok((await query.OrderByDescending(p => p.PurchasedAt).ToListAsync()).Select(MapPurchase).ToList());
    }

    public async Task<ApiResult<PurchaseDto>> GetPurchaseAsync(Guid tenantId, Guid purchaseId)
    {
        var purchase = await FindPurchase(tenantId, purchaseId, true);
        return purchase == null
            ? ApiResult<PurchaseDto>.Fail("Purchase not found.")
            : ApiResult<PurchaseDto>.Ok(MapPurchase(purchase));
    }

    public async Task<ApiResult<PurchaseDto>> CreatePurchaseAsync(Guid tenantId, string idempotencyKey, CreatePurchaseRequest request)
    {
        var keyError = ValidateKey(idempotencyKey);
        if (keyError != null) return ApiResult<PurchaseDto>.Fail(keyError);
        if (request.Items == null || request.Items.Count == 0) return ApiResult<PurchaseDto>.Fail("Add at least one purchase item.");
        var invoiceImage = NormalizeImageDataUrl(request.InvoiceImageDataUrl, out var invoiceImageError);
        if (invoiceImageError != null) return ApiResult<PurchaseDto>.Fail(invoiceImageError);
        var requestHash = Hash(request);
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.Purchases.AsNoTracking().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != requestHash) return ApiResult<PurchaseDto>.Fail("This idempotency key was already used for a different purchase.");
            var replay = await FindPurchase(tenantId, existing.Id, true);
            if (write != null) await write.CommitAsync();
            return ApiResult<PurchaseDto>.Ok(MapPurchase(replay!));
        }
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == request.SupplierId && s.Status == "Active");
        if (supplier == null) return ApiResult<PurchaseDto>.Fail("Choose an active supplier in this business.");
        var productIds = request.Items.Where(i => i.ProductId.HasValue).Select(i => i.ProductId!.Value).Distinct().ToList();
        var products = await db.Products.Where(p => p.TenantId == tenantId && productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
        if (products.Count != productIds.Count) return ApiResult<PurchaseDto>.Fail("One or more selected products are unavailable in this business.");
        var purchasedAt = Utc(request.PurchasedAt ?? DateTime.UtcNow);
        var dayStart = purchasedAt.Date;
        var next = await db.Purchases.CountAsync(p => p.TenantId == tenantId && p.PurchasedAt >= dayStart && p.PurchasedAt < dayStart.AddDays(1)) + 1;
        var purchase = new Purchase { Id = Guid.NewGuid(), TenantId = tenantId, SupplierId = supplier.Id,
            PurchaseNumber = $"PUR-{purchasedAt:yyyyMMdd}-{next:D4}", Currency = await Currency(tenantId), Status = "Posted",
            Notes = Clean(request.Notes), InvoiceImageDataUrl = invoiceImage, IdempotencyKey = idempotencyKey, RequestHash = requestHash,
            PurchasedAt = purchasedAt, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Supplier = supplier };
        foreach (var requested in request.Items)
        {
            if (string.IsNullOrWhiteSpace(requested.Description) || string.IsNullOrWhiteSpace(requested.Unit))
                return ApiResult<PurchaseDto>.Fail("Every purchase line needs a description and unit.");
            if (requested.Quantity <= 0 || requested.UnitCost < 0 || Scale(requested.Quantity) > 4 || Scale(requested.UnitCost) > 4)
                return ApiResult<PurchaseDto>.Fail("Purchase quantities must be positive and costs non-negative, with at most four decimal places.");
            if (requested.ProductId.HasValue && products.TryGetValue(requested.ProductId.Value, out var prod))
            {
                if (prod.TrackInventory)
                {
                    prod.StockQuantity = Money(prod.StockQuantity + requested.Quantity);
                }
                if (requested.UnitCost > 0)
                {
                    prod.CostPrice = Money(requested.UnitCost);
                }
                prod.UpdatedAt = DateTime.UtcNow;
            }
            purchase.Items.Add(new PurchaseItem { Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = purchase.Id,
                ProductId = requested.ProductId, Product = requested.ProductId.HasValue ? products[requested.ProductId.Value] : null,
                Description = requested.Description.Trim(), Unit = requested.Unit.Trim(), Quantity = requested.Quantity,
                UnitCost = Money(requested.UnitCost), LineTotal = Money(requested.Quantity * requested.UnitCost) });
        }
        purchase.TotalAmount = Money(purchase.Items.Sum(i => i.LineTotal));
        if (purchase.TotalAmount <= 0) return ApiResult<PurchaseDto>.Fail("Purchase total must be greater than zero.");
        if (request.PaymentAmount < 0 || request.PaymentAmount > purchase.TotalAmount || Scale(request.PaymentAmount) > 4)
            return ApiResult<PurchaseDto>.Fail("Initial payment cannot be negative or exceed the purchase total.");
        if (request.PaymentAmount > 0) purchase.Payments.Add(new PurchasePayment { Id = Guid.NewGuid(), TenantId = tenantId,
            PurchaseId = purchase.Id, SupplierId = supplier.Id, Amount = Money(request.PaymentAmount), Currency = purchase.Currency,
            Method = NormalizeMethod(request.PaymentMethod), IdempotencyKey = $"{purchase.Id:N}:initial", RequestHash = requestHash,
            PaidAt = purchasedAt, CreatedAt = DateTime.UtcNow, Supplier = supplier });
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<PurchaseDto>.Ok(MapPurchase(purchase));
    }

    public async Task<ApiResult<PurchaseDto>> RecordPurchasePaymentAsync(Guid tenantId, Guid purchaseId, string idempotencyKey, RecordPurchasePaymentRequest request)
    {
        var keyError = ValidateKey(idempotencyKey);
        if (keyError != null) return ApiResult<PurchaseDto>.Fail(keyError);
        var requestHash = Hash(new { purchaseId, request.Amount, request.Method, request.Reference, request.Notes, request.PaidAt });
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.PurchasePayments.AsNoTracking().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != requestHash) return ApiResult<PurchaseDto>.Fail("This idempotency key was already used for a different supplier payment.");
            var replay = await FindPurchase(tenantId, existing.PurchaseId, true);
            if (write != null) await write.CommitAsync();
            return ApiResult<PurchaseDto>.Ok(MapPurchase(replay!));
        }
        var purchase = await FindPurchase(tenantId, purchaseId, false);
        if (purchase == null) return ApiResult<PurchaseDto>.Fail("Purchase not found.");
        var activePayments = purchase.Payments.Where(p => !p.IsReversed).ToList();
        var remaining = Money(purchase.TotalAmount - activePayments.Sum(p => p.Amount));
        if (request.Amount <= 0 || request.Amount > remaining || Scale(request.Amount) > 4)
            return ApiResult<PurchaseDto>.Fail("Payment must be positive, may have at most four decimal places, and cannot exceed the outstanding balance.");
        var payment = new PurchasePayment { Id = Guid.NewGuid(), TenantId = tenantId, PurchaseId = purchase.Id,
            SupplierId = purchase.SupplierId, Amount = Money(request.Amount), Currency = purchase.Currency,
            Method = NormalizeMethod(request.Method), Reference = Clean(request.Reference), Notes = Clean(request.Notes),
            IdempotencyKey = idempotencyKey, RequestHash = requestHash, PaidAt = Utc(request.PaidAt ?? DateTime.UtcNow),
            CreatedAt = DateTime.UtcNow, Supplier = purchase.Supplier };
        purchase.Payments.Add(payment);
        db.PurchasePayments.Add(payment);
        purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<PurchaseDto>.Ok(MapPurchase(purchase));
    }

    public async Task<ApiResult<PurchaseDto>> ReversePurchasePaymentAsync(
        Guid tenantId, Guid purchaseId, Guid paymentId, Guid? userId, ReversePaymentRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var purchase = await FindPurchase(tenantId, purchaseId, false);
        if (purchase == null) return ApiResult<PurchaseDto>.Fail("Purchase not found.");
        var payment = purchase.Payments.FirstOrDefault(p => p.Id == paymentId);
        if (payment == null) return ApiResult<PurchaseDto>.Fail("Supplier payment not found on this purchase.");
        if (payment.IsReversed) return ApiResult<PurchaseDto>.Fail("This payment has already been reversed.");

        payment.IsReversed = true;
        payment.ReversedAt = DateTime.UtcNow;
        payment.ReversedByUserId = userId;
        payment.ReversalReason = Clean(request.Reason) ?? "Supplier payment reversed by user";
        purchase.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<PurchaseDto>.Ok(MapPurchase(purchase));
    }

    public async Task<ApiResult<PurchaseDto>> VoidPurchaseAsync(
        Guid tenantId, Guid purchaseId, Guid? userId = null, VoidPurchaseRequest? request = null)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var purchase = await FindPurchase(tenantId, purchaseId, false);
        if (purchase == null) return ApiResult<PurchaseDto>.Fail("Purchase not found.");
        if (purchase.Status == "Voided") return ApiResult<PurchaseDto>.Ok(MapPurchase(purchase));

        var activePayments = purchase.Payments.Where(p => !p.IsReversed).ToList();
        if (activePayments.Count > 0)
        {
            if (request == null || !request.ReversePayments)
                return ApiResult<PurchaseDto>.Fail("A purchase with active payments cannot be voided. Reverse the payments first, or confirm void with payment reversal.");

            foreach (var payment in activePayments)
            {
                payment.IsReversed = true;
                payment.ReversedAt = DateTime.UtcNow;
                payment.ReversedByUserId = userId;
                payment.ReversalReason = Clean(request.Reason) ?? $"Reversed due to voiding purchase {purchase.PurchaseNumber}";
            }
        }

        var productIds = purchase.Items.Where(i => i.ProductId.HasValue).Select(i => i.ProductId!.Value).Distinct().ToList();
        var products = await db.Products.Where(p => p.TenantId == tenantId && productIds.Contains(p.Id)).ToListAsync();

        // Check if any product has already had received units sold
        foreach (var item in purchase.Items)
        {
            if (item.ProductId.HasValue)
            {
                var prod = products.FirstOrDefault(p => p.Id == item.ProductId.Value);
                if (prod != null && prod.TrackInventory)
                {
                    if (prod.StockQuantity < item.Quantity)
                    {
                        return ApiResult<PurchaseDto>.Fail($"Cannot void purchase: Product '{prod.Name}' has only {prod.StockQuantity:0.####} in stock, but {item.Quantity:0.####} were received in this purchase. Some items have already been sold. Adjust sales or stock before voiding this purchase.");
                    }
                }
            }
        }

        foreach (var item in purchase.Items)
        {
            if (item.ProductId.HasValue)
            {
                var prod = products.FirstOrDefault(p => p.Id == item.ProductId.Value);
                if (prod != null && prod.TrackInventory)
                {
                    prod.StockQuantity = Money(prod.StockQuantity - item.Quantity);
                    prod.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        purchase.Status = "Voided";
        purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<PurchaseDto>.Ok(MapPurchase(purchase));
    }

    public async Task<ApiResult<List<BusinessExpenseDto>>> GetBusinessExpensesAsync(Guid tenantId, string? search, string? category, DateTime? from, DateTime? to)
    {
        var query = db.BusinessExpenses.AsNoTracking().Where(e => e.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search)) { var term = search.Trim().ToLower(); query = query.Where(e => (e.Description != null && e.Description.ToLower().Contains(term)) || e.Category.ToLower().Contains(term)); }
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (from.HasValue) query = query.Where(e => e.ExpenseDate >= Utc(from.Value));
        if (to.HasValue) query = query.Where(e => e.ExpenseDate < Utc(to.Value.Date.AddDays(1)));
        return ApiResult<List<BusinessExpenseDto>>.Ok((await query.OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.CreatedAt).ToListAsync()).Select(MapExpense).ToList());
    }

    public async Task<ApiResult<BusinessExpenseDto>> CreateBusinessExpenseAsync(Guid tenantId, string idempotencyKey, CreateBusinessExpenseRequest request)
    {
        var keyError = ValidateKey(idempotencyKey);
        if (keyError != null) return ApiResult<BusinessExpenseDto>.Fail(keyError);
        var category = request.Category?.Trim();
        if (string.IsNullOrWhiteSpace(category)) return ApiResult<BusinessExpenseDto>.Fail("Expense category is required.");
        if (request.Amount <= 0 || Scale(request.Amount) > 4) return ApiResult<BusinessExpenseDto>.Fail("Expense amount must be positive with at most four decimal places.");
        var receiptImage = NormalizeImageDataUrl(request.ReceiptImageDataUrl, out var receiptImageError);
        if (receiptImageError != null) return ApiResult<BusinessExpenseDto>.Fail(receiptImageError);
        var hash = Hash(request);
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.BusinessExpenses.AsNoTracking().FirstOrDefaultAsync(e => e.TenantId == tenantId && e.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != hash) return ApiResult<BusinessExpenseDto>.Fail("This idempotency key was already used for a different expense.");
            if (write != null) await write.CommitAsync();
            return ApiResult<BusinessExpenseDto>.Ok(MapExpense(existing));
        }
        var date = Utc(request.ExpenseDate ?? DateTime.UtcNow);
        if (date > DateTime.UtcNow.AddDays(1)) return ApiResult<BusinessExpenseDto>.Fail("Expense date cannot be in the future.");
        var expense = new BusinessExpense { Id = Guid.NewGuid(), TenantId = tenantId, Category = category,
            Amount = Money(request.Amount), Currency = await Currency(tenantId), Description = Clean(request.Description), ReceiptImageDataUrl = receiptImage,
            IdempotencyKey = idempotencyKey, RequestHash = hash, ExpenseDate = date, CreatedAt = DateTime.UtcNow };
        db.BusinessExpenses.Add(expense); await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<BusinessExpenseDto>.Ok(MapExpense(expense));
    }

    public async Task<ApiResult<BusinessExpenseDto>> UpdateBusinessExpenseAsync(Guid tenantId, Guid expenseId, UpdateBusinessExpenseRequest request)
    {
        var expense = await db.BusinessExpenses.FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == expenseId);
        if (expense == null) return ApiResult<BusinessExpenseDto>.Fail("Expense not found.");
        var category = request.Category?.Trim();
        if (string.IsNullOrWhiteSpace(category)) return ApiResult<BusinessExpenseDto>.Fail("Expense category is required.");
        if (request.Amount <= 0 || Scale(request.Amount) > 4) return ApiResult<BusinessExpenseDto>.Fail("Expense amount must be positive with at most four decimal places.");
        var receiptImage = NormalizeImageDataUrl(request.ReceiptImageDataUrl, out var receiptImageError);
        if (receiptImageError != null) return ApiResult<BusinessExpenseDto>.Fail(receiptImageError);

        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var date = Utc(request.ExpenseDate ?? expense.ExpenseDate);
        if (date > DateTime.UtcNow.AddDays(1)) return ApiResult<BusinessExpenseDto>.Fail("Expense date cannot be in the future.");

        expense.Category = category;
        expense.Amount = Money(request.Amount);
        expense.Description = Clean(request.Description);
        if (request.RemoveReceiptImage) expense.ReceiptImageDataUrl = null;
        else if (receiptImage != null) expense.ReceiptImageDataUrl = receiptImage;
        expense.ExpenseDate = date;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();

        return ApiResult<BusinessExpenseDto>.Ok(MapExpense(expense));
    }

    public async Task<ApiResult> DeleteBusinessExpenseAsync(Guid tenantId, Guid expenseId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var expense = await db.BusinessExpenses.FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == expenseId);
        if (expense == null) return ApiResult.Fail("Expense not found.");

        db.BusinessExpenses.Remove(expense);
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();

        return ApiResult.Ok();
    }

    public async Task<ApiResult<BusinessDashboardDto>> GetDashboardAsync(Guid tenantId, string? period = "today", DateTime? from = null, DateTime? to = null)
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var todayEnd = todayStart.AddDays(1);
        var normalizedPeriod = (period ?? "today").Trim().ToLowerInvariant();

        DateTime periodStart;
        DateTime periodEnd = now;

        if (from.HasValue)
        {
            periodStart = Utc(from.Value);
            periodEnd = to.HasValue ? Utc(to.Value.Date.AddDays(1)) : now;
            normalizedPeriod = "custom";
        }
        else
        {
            switch (normalizedPeriod)
            {
                case "week":
                    var diff = (7 + (int)now.DayOfWeek - (int)DayOfWeek.Monday) % 7;
                    periodStart = todayStart.AddDays(-diff);
                    break;
                case "month":
                    periodStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    break;
                case "year":
                    periodStart = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                    break;
                case "all":
                    periodStart = DateTime.MinValue;
                    break;
                case "today":
                default:
                    normalizedPeriod = "today";
                    periodStart = todayStart;
                    periodEnd = todayEnd;
                    break;
            }
        }

        var currency = await Currency(tenantId);
        var sales = await db.Sales.AsNoTracking().Where(s => s.TenantId == tenantId && s.Status == SaleStatuses.Posted)
            .Include(s => s.Customer).Include(s => s.Items).Include(s => s.Payments).ToListAsync();
        var purchases = await db.Purchases.AsNoTracking().Where(p => p.TenantId == tenantId && p.Status == "Posted")
            .Include(p => p.Supplier).Include(p => p.Payments).ToListAsync();
        var expenses = await db.BusinessExpenses.AsNoTracking().Where(e => e.TenantId == tenantId).ToListAsync();

        var customers = sales.GroupBy(s => s.CustomerId).Select(g => new { Customer = g.First().Customer!, Sales = g.ToList() })
            .Select(x => MapDashboardCustomer(x.Customer, x.Sales, currency)).Where(c => c.OutstandingBalance > 0)
            .OrderByDescending(c => c.OutstandingBalance).Take(5).ToList();
        var suppliers = purchases.GroupBy(p => p.SupplierId).Select(g => new { Supplier = g.First().Supplier!, Purchases = g.ToList() })
            .Select(x => MapDashboardSupplier(x.Supplier, x.Purchases, currency)).Where(s => s.OutstandingBalance > 0)
            .OrderByDescending(s => s.OutstandingBalance).Take(5).ToList();

        var activity = sales.Select(s => new BusinessActivityDto("Sale", s.Id, s.Customer?.Name ?? "Customer", s.SaleNumber, s.TotalAmount, s.SoldAt))
            .Concat(sales.SelectMany(s => s.Payments.Where(p => !p.IsReversed).Select(p => new BusinessActivityDto("Customer payment", p.Id, s.Customer?.Name ?? "Customer", s.SaleNumber, p.Amount, p.PaidAt))))
            .Concat(purchases.Select(p => new BusinessActivityDto("Purchase", p.Id, p.Supplier?.Name ?? "Supplier", p.PurchaseNumber, p.TotalAmount, p.PurchasedAt)))
            .Concat(purchases.SelectMany(p => p.Payments.Where(x => !x.IsReversed).Select(x => new BusinessActivityDto("Supplier payment", x.Id, p.Supplier?.Name ?? "Supplier", p.PurchaseNumber, x.Amount, x.PaidAt))))
            .Concat(expenses.Select(e => new BusinessActivityDto("Expense", e.Id, e.Category, e.Description ?? "Expense", e.Amount, e.ExpenseDate)))
            .OrderByDescending(a => a.OccurredAt).Take(10).ToList();

        var todaySalesAmount = Money(sales.Where(s => s.SoldAt >= todayStart && s.SoldAt < todayEnd).Sum(s => s.TotalAmount));
        var todayPaymentsAmount = Money(sales.SelectMany(s => s.Payments).Where(p => !p.IsReversed && p.PaidAt >= todayStart && p.PaidAt < todayEnd).Sum(p => p.Amount));
        var todayPurchasesAmount = Money(purchases.Where(p => p.PurchasedAt >= todayStart && p.PurchasedAt < todayEnd).Sum(p => p.TotalAmount));
        var todaySupplierPaymentsAmount = Money(purchases.SelectMany(p => p.Payments).Where(p => !p.IsReversed && p.PaidAt >= todayStart && p.PaidAt < todayEnd).Sum(p => p.Amount));
        var todayExpensesAmount = Money(expenses.Where(e => e.ExpenseDate >= todayStart && e.ExpenseDate < todayEnd).Sum(e => e.Amount));

        var periodSalesList = sales.Where(s => s.SoldAt >= periodStart && s.SoldAt <= periodEnd).ToList();
        var periodSalesAmount = Money(periodSalesList.Sum(s => s.TotalAmount));
        var periodCogsAmount = Money(periodSalesList.SelectMany(s => s.Items).Where(i => i.UnitCost.HasValue).Sum(i => i.Quantity * i.UnitCost!.Value));
        var periodPaymentsAmount = Money(sales.SelectMany(s => s.Payments).Where(p => !p.IsReversed && p.PaidAt >= periodStart && p.PaidAt <= periodEnd).Sum(p => p.Amount));
        var periodPurchasesAmount = Money(purchases.Where(p => p.PurchasedAt >= periodStart && p.PurchasedAt <= periodEnd).Sum(p => p.TotalAmount));
        var periodSupplierPaymentsAmount = Money(purchases.SelectMany(p => p.Payments).Where(p => !p.IsReversed && p.PaidAt >= periodStart && p.PaidAt <= periodEnd).Sum(p => p.Amount));
        var periodExpensesAmount = Money(expenses.Where(e => e.ExpenseDate >= periodStart && e.ExpenseDate <= periodEnd).Sum(e => e.Amount));
        var periodNetProfit = Money(periodSalesAmount - periodCogsAmount - periodExpensesAmount);

        var totalOutstandingCustomers = Money(sales.Sum(s => s.TotalAmount - s.Payments.Where(p => !p.IsReversed).Sum(p => p.Amount)));
        var totalOutstandingSuppliers = Money(purchases.Sum(p => p.TotalAmount - p.Payments.Where(x => !x.IsReversed).Sum(x => x.Amount)));

        return ApiResult<BusinessDashboardDto>.Ok(new(
            currency,
            todaySalesAmount,
            todayPaymentsAmount,
            todayPurchasesAmount,
            todaySupplierPaymentsAmount,
            todayExpensesAmount,
            totalOutstandingCustomers,
            totalOutstandingSuppliers,
            customers,
            suppliers,
            activity,
            normalizedPeriod,
            periodSalesAmount,
            periodCogsAmount,
            periodPaymentsAmount,
            periodPurchasesAmount,
            periodSupplierPaymentsAmount,
            periodExpensesAmount,
            periodNetProfit
        ));
    }

    private async Task<Purchase?> FindPurchase(Guid tenantId, Guid id, bool noTracking)
    {
        var query = db.Purchases.Where(p => p.TenantId == tenantId && p.Id == id)
            .Include(p => p.Supplier).Include(p => p.Items).Include(p => p.Payments).AsQueryable();
        return await (noTracking ? query.AsNoTracking() : query).FirstOrDefaultAsync();
    }
    private static SupplierDto MapSupplier(Supplier s, string currency) => MapDashboardSupplier(s, s.Purchases.Where(p => p.Status == "Posted").ToList(), currency);
    private static SupplierDto MapDashboardSupplier(Supplier s, List<Purchase> purchases, string currency)
    { var total = Money(purchases.Sum(p => p.TotalAmount)); var paid = Money(purchases.SelectMany(p => p.Payments.Where(p => !p.IsReversed)).Sum(p => p.Amount)); return new(s.Id, s.Name, s.Phone, s.Email, s.Address, s.Notes, s.Status, currency, total, paid, Money(total - paid), purchases.Count, s.CreatedAt); }
    private static BusinessCustomerDto MapDashboardCustomer(Customer c, List<Sale> sales, string currency)
    { var total = Money(sales.Sum(s => s.TotalAmount)); var paid = Money(sales.SelectMany(s => s.Payments.Where(p => !p.IsReversed)).Sum(p => p.Amount)); return new(c.Id, c.Name, c.Phone, c.Email, c.Address, c.Notes, c.Status, currency, total, paid, Money(total - paid), sales.Count, c.CreatedAt); }
    private static PurchaseDto MapPurchase(Purchase p)
    { var paid = Money(p.Payments.Where(x => !x.IsReversed).Sum(x => x.Amount)); var balance = p.Status == "Voided" ? 0m : Money(p.TotalAmount - paid); return new(p.Id, p.PurchaseNumber, p.SupplierId, p.Supplier?.Name ?? "Supplier", p.Currency, p.TotalAmount, paid, balance, p.Status == "Voided" ? "Voided" : balance == 0 ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid", p.Status, p.Notes, p.PurchasedAt, p.CreatedAt, p.Items.Select(i => new PurchaseItemDto(i.Id, i.ProductId, i.Description, i.Unit, i.Quantity, i.UnitCost, i.LineTotal)).ToList(), p.Payments.OrderByDescending(x => x.PaidAt).Select(x => new PurchasePaymentDto(x.Id, x.PurchaseId, p.PurchaseNumber, x.SupplierId, x.Amount, x.Currency, x.Method, x.Reference, x.Notes, x.PaidAt, x.IsReversed, x.ReversedAt, x.ReversalReason)).ToList(), p.InvoiceImageDataUrl); }
    private static BusinessExpenseDto MapExpense(BusinessExpense e) => new(e.Id, e.Category, e.Amount, e.Currency, e.Description, e.ExpenseDate, e.CreatedAt, e.ReceiptImageDataUrl);
}
