using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Controllers;

[ApiController, Route("api/overview"), Authorize]
public sealed class OverviewController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var tenantId = User.GetTenantId();
        var currency = await db.Tenants.AsNoTracking().Where(t => t.Id == tenantId).Select(t => t.BaseCurrency).FirstOrDefaultAsync() ?? "USD";
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var chartStart = monthStart.AddMonths(-5);

        var balance = await db.Accounts.AsNoTracking()
            .Where(a => a.TenantId == tenantId && a.Currency == currency && a.AccountType == AccountTypes.Asset && a.Status == AccountStatuses.Active)
            .SumAsync(a => a.CachedBalance);
        var payments = await db.InvoicePayments.AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Currency == currency && p.PaidAt >= chartStart).ToListAsync();
        var expenses = await db.Expenses.AsNoTracking()
            .Where(e => e.TenantId == tenantId && e.Currency == currency && e.Status == ExpenseStatuses.Posted && e.ExpenseDate >= chartStart).ToListAsync();
        var incomeMonth = payments.Where(p => p.PaidAt >= monthStart).Sum(p => p.Amount);
        var expensesMonth = expenses.Where(e => e.ExpenseDate >= monthStart).Sum(e => e.Amount);

        var outstandingInvoices = await db.Invoices.AsNoTracking().Include(i => i.Client)
            .Where(i => i.TenantId == tenantId && i.Currency == currency && i.AmountPaid < i.TotalAmount &&
                i.Status != InvoiceStatuses.Draft && i.Status != InvoiceStatuses.Cancelled)
            .OrderBy(i => i.DueDate).Take(8).ToListAsync();
        var allOutstandingAmount = await db.Invoices.AsNoTracking()
            .Where(i => i.TenantId == tenantId && i.Currency == currency && i.AmountPaid < i.TotalAmount &&
                i.Status != InvoiceStatuses.Draft && i.Status != InvoiceStatuses.Cancelled)
            .SumAsync(i => i.TotalAmount - i.AmountPaid);
        var outstandingCount = await db.Invoices.CountAsync(i => i.TenantId == tenantId && i.Currency == currency && i.AmountPaid < i.TotalAmount &&
            i.Status != InvoiceStatuses.Draft && i.Status != InvoiceStatuses.Cancelled);

        var recent = await db.Transactions.AsNoTracking()
            .Where(t => t.TenantId == tenantId && t.Currency == currency && t.Status != TransactionStatuses.Failed)
            .OrderByDescending(t => t.PostedAt ?? t.CreatedAt).Take(8).ToListAsync();
        var chart = Enumerable.Range(0, 6).Select(offset =>
        {
            var start = chartStart.AddMonths(offset);
            var end = start.AddMonths(1);
            return new CashFlowPointDto(start.ToString("MMM"), payments.Where(p => p.PaidAt >= start && p.PaidAt < end).Sum(p => p.Amount),
                expenses.Where(e => e.ExpenseDate >= start && e.ExpenseDate < end).Sum(e => e.Amount));
        }).ToList();

        var dto = new FinancialOverviewDto(currency, balance, incomeMonth, expensesMonth, incomeMonth - expensesMonth,
            allOutstandingAmount, outstandingCount, outstandingInvoices.Count(i => i.DueDate < now), chart,
            outstandingInvoices.Select(i => new OverviewInvoiceDto(i.Id, i.InvoiceNumber, i.Client?.Name ?? "Client", i.DueDate,
                i.TotalAmount - i.AmountPaid, i.Currency, i.DueDate < now ? InvoiceStatuses.Overdue : i.Status)).ToList(),
            recent.Select(t => new OverviewTransactionDto(t.Id, t.Description ?? t.ReferenceNumber, t.TransactionType, t.Status,
                t.Amount, t.Currency, t.PostedAt ?? t.CreatedAt, t.Category)).ToList());
        return Ok(ApiResult<FinancialOverviewDto>.Ok(dto));
    }
}
