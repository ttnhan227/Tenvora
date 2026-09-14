using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/reports"), Authorize]
public sealed class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var tenantId = User.GetTenantId();
        var endInclusive = (to ?? DateTime.UtcNow).Date;
        var start = (from ?? endInclusive.AddMonths(-11).AddDays(1 - endInclusive.Day)).Date;
        if (endInclusive < start) return BadRequest(ApiResult.Fail("End date cannot be before start date."));
        if (endInclusive.AddDays(1) - start > TimeSpan.FromDays(731)) return BadRequest(ApiResult.Fail("Choose a range of two years or less."));
        var end = endInclusive.AddDays(1);
        var currency = await db.Tenants.AsNoTracking().Where(t => t.Id == tenantId).Select(t => t.BaseCurrency).FirstOrDefaultAsync() ?? "USD";
        var payments = await db.InvoicePayments.AsNoTracking().Include(p => p.Invoice).ThenInclude(i => i!.Client)
            .Where(p => p.TenantId == tenantId && p.Currency == currency && p.PaidAt >= start && p.PaidAt < end).ToListAsync();
        var expenses = await db.Expenses.AsNoTracking().Where(e => e.TenantId == tenantId && e.Currency == currency &&
            e.Status == ExpenseStatuses.Posted && e.ExpenseDate >= start && e.ExpenseDate < end).ToListAsync();
        var outstanding = await db.Invoices.AsNoTracking().Where(i => i.TenantId == tenantId && i.Currency == currency &&
            i.AmountPaid < i.TotalAmount && i.Status != InvoiceStatuses.Draft && i.Status != InvoiceStatuses.Cancelled)
            .SumAsync(i => i.TotalAmount - i.AmountPaid);

        var cursor = new DateTime(start.Year, start.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var months = new List<CashFlowPointDto>();
        while (cursor < end && months.Count < 24)
        {
            var next = cursor.AddMonths(1);
            months.Add(new(cursor.ToString("MMM yy"), payments.Where(p => p.PaidAt >= cursor && p.PaidAt < next).Sum(p => p.Amount),
                expenses.Where(e => e.ExpenseDate >= cursor && e.ExpenseDate < next).Sum(e => e.Amount)));
            cursor = next;
        }
        var income = payments.Sum(p => p.Amount);
        var expenseTotal = expenses.Sum(e => e.Amount);
        var dto = new FinancialReportDto(currency, start, endInclusive, income, expenseTotal, income - expenseTotal, outstanding,
            payments.GroupBy(p => p.Invoice?.Client?.Name ?? "Client").OrderByDescending(g => g.Sum(p => p.Amount)).Select(g => new NamedAmountDto(g.Key, g.Sum(p => p.Amount))).ToList(),
            expenses.GroupBy(e => e.Category).OrderByDescending(g => g.Sum(e => e.Amount)).Select(g => new NamedAmountDto(g.Key, g.Sum(e => e.Amount))).ToList(), months);
        return Ok(ApiResult<FinancialReportDto>.Ok(dto));
    }
}
