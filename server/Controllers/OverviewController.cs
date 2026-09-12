using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
namespace Tenvora.Api.Controllers;
[ApiController, Route("api/overview"), Authorize]
public class OverviewController(AppDbContext db) : ControllerBase
{
 [HttpGet]
 public async Task<IActionResult> Get()
 {
  var tenant = User.GetTenantId();
  var since = DateTime.UtcNow.AddDays(-30);
  var balances = await db.Accounts.AsNoTracking().Where(a => a.TenantId == tenant && a.AccountType == "Asset" && a.Status != "Closed").GroupBy(a => a.Currency).Select(g => new { Currency = g.Key, Balance = g.Sum(a => a.CachedBalance), Accounts = g.Count() }).ToListAsync();
  var volume = await db.Transactions.AsNoTracking().Where(t => t.TenantId == tenant && t.TransactionType == "Transfer" && t.CreatedAt >= since && (t.Status == "Posted" || t.Status == "Settled")).GroupBy(t => t.Currency).Select(g => new { Currency = g.Key, Amount = g.Sum(t => t.Amount), Count = g.Count() }).ToListAsync();
  var pending = await db.Transactions.CountAsync(t => t.TenantId == tenant && (t.Status == "Processing" || t.Status == "PendingAuthorization" || t.Status == "Initiated"));
  var openBatches = await db.SettlementBatches.CountAsync(b => b.TenantId == tenant && b.Status == "Open");
  var reconciliation = await db.ReconciliationRuns.AsNoTracking().Where(r => r.TenantId == tenant).OrderByDescending(r => r.StartedAt).Select(r => new { r.Id, r.DiscrepancyCount, r.CompletedAt }).FirstOrDefaultAsync();
  return Ok(ApiResult<object>.Ok(new { Balances = balances, Volume = volume, PaymentsInProgress = pending, OpenBatches = openBatches, Reconciliation = reconciliation }));
 }
}
