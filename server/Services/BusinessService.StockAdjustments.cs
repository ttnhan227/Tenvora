using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed partial class BusinessService
{
    public async Task<ApiResult<StockAdjustmentDto>> CreateStockAdjustmentAsync(
        Guid tenantId, Guid? userId, CreateStockAdjustmentRequest request, string? idempotencyKey = null)
    {
        if (idempotencyKey != null && ValidateKey(idempotencyKey) is { } keyError)
            return ApiResult<StockAdjustmentDto>.Fail(keyError);
        if (Scale(request.AdjustmentQuantity) > 4)
            return ApiResult<StockAdjustmentDto>.Fail("Adjustment quantity may have at most four decimal places.");
        if (request.AdjustmentQuantity == 0)
            return ApiResult<StockAdjustmentDto>.Fail("Adjustment quantity cannot be zero.");

        var reason = request.Reason?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(reason))
            return ApiResult<StockAdjustmentDto>.Fail("Adjustment reason is required.");

        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        // A tenant-scoped deterministic record ID makes retries safe without
        // changing the schema or the IDs of existing adjustment history.
        var adjustmentId = idempotencyKey == null ? Guid.NewGuid()
            : new Guid(SHA256.HashData(Encoding.UTF8.GetBytes($"stock-adjustment:{tenantId:N}:{idempotencyKey}"))[..16]);
        var existing = await db.StockAdjustments.AsNoTracking().Include(a => a.Product)
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == adjustmentId);
        if (existing != null)
        {
            if (existing.ProductId != request.ProductId || existing.AdjustmentQuantity != request.AdjustmentQuantity
                || existing.Reason != reason || existing.Notes != Clean(request.Notes))
                return ApiResult<StockAdjustmentDto>.Fail("This idempotency key was already used for a different stock adjustment.");
            return ApiResult<StockAdjustmentDto>.Ok(new(existing.Id, existing.ProductId,
                existing.Product?.Name ?? "Product", existing.Product?.Unit ?? "item", existing.QuantityBefore,
                existing.AdjustmentQuantity, existing.QuantityAfter, existing.Reason, existing.Notes,
                existing.UserId, existing.AdjustedAt, existing.CreatedAt));
        }
        var product = await db.Products.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.ProductId);
        if (product == null) return ApiResult<StockAdjustmentDto>.Fail("Product not found.");

        var before = product.StockQuantity;
        var after = Money(before + request.AdjustmentQuantity);
        if (after < 0)
            return ApiResult<StockAdjustmentDto>.Fail($"Stock cannot become negative. Current: {before:0.####}, Adjustment: {request.AdjustmentQuantity:0.####}, Result: {after:0.####}.");

        product.StockQuantity = after;
        product.UpdatedAt = DateTime.UtcNow;

        var adjustment = new StockAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            ProductId = product.Id,
            UserId = userId,
            QuantityBefore = before,
            AdjustmentQuantity = request.AdjustmentQuantity,
            QuantityAfter = after,
            Reason = reason,
            Notes = Clean(request.Notes),
            AdjustedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            Product = product
        };

        db.StockAdjustments.Add(adjustment);
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();

        return ApiResult<StockAdjustmentDto>.Ok(new StockAdjustmentDto(
            adjustment.Id,
            adjustment.ProductId,
            product.Name,
            product.Unit,
            adjustment.QuantityBefore,
            adjustment.AdjustmentQuantity,
            adjustment.QuantityAfter,
            adjustment.Reason,
            adjustment.Notes,
            adjustment.UserId,
            adjustment.AdjustedAt,
            adjustment.CreatedAt
        ));
    }

    public async Task<ApiResult<List<StockAdjustmentDto>>> GetStockAdjustmentsAsync(Guid tenantId, Guid? productId)
    {
        var query = db.StockAdjustments.AsNoTracking().Where(a => a.TenantId == tenantId).Include(a => a.Product).AsQueryable();
        if (productId.HasValue) query = query.Where(a => a.ProductId == productId.Value);
        var list = await query.OrderByDescending(a => a.AdjustedAt).ToListAsync();
        return ApiResult<List<StockAdjustmentDto>>.Ok(list.Select(a => new StockAdjustmentDto(
            a.Id,
            a.ProductId,
            a.Product?.Name ?? "Product",
            a.Product?.Unit ?? "item",
            a.QuantityBefore,
            a.AdjustmentQuantity,
            a.QuantityAfter,
            a.Reason,
            a.Notes,
            a.UserId,
            a.AdjustedAt,
            a.CreatedAt
        )).ToList());
    }
}
