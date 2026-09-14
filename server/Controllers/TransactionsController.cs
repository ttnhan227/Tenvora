using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/transactions"), Authorize]
public sealed class TransactionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] string? type, [FromQuery] string? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string sort = "date_desc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var tenantId = User.GetTenantId();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 100);
        var query = db.Transactions.AsNoTracking().Where(t => t.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t => t.ReferenceNumber.ToLower().Contains(term) ||
                (t.Description != null && t.Description.ToLower().Contains(term)) ||
                (t.Category != null && t.Category.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(t => t.TransactionType == type);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(t => t.Status == status);
        if (from.HasValue) query = query.Where(t => (t.PostedAt ?? t.CreatedAt) >= from.Value.Date);
        if (to.HasValue) query = query.Where(t => (t.PostedAt ?? t.CreatedAt) < to.Value.Date.AddDays(1));
        var count = await query.CountAsync();
        query = sort switch
        {
            "date_asc" => query.OrderBy(t => t.PostedAt ?? t.CreatedAt),
            "amount_desc" => query.OrderByDescending(t => t.Amount).ThenByDescending(t => t.CreatedAt),
            "amount_asc" => query.OrderBy(t => t.Amount).ThenByDescending(t => t.CreatedAt),
            _ => query.OrderByDescending(t => t.PostedAt ?? t.CreatedAt)
        };
        var rows = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var items = rows.Select(t => new TransactionResponse(t.Id, t.TenantId, t.PaymentRequestId, t.ReferenceNumber,
            t.TransactionType, t.Status, t.OriginalTransactionId, t.Amount, t.Currency, t.Description, t.Category,
            t.RelatedEntityType, t.RelatedEntityId, t.CreatedAt, t.PostedAt, t.SettledAt, [])).ToList();
        return Ok(ApiResult<TransactionPageDto>.Ok(new(items, page, pageSize, count, (int)Math.Ceiling(count / (decimal)pageSize))));
    }
}
