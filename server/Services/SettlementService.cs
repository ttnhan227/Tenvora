using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
namespace Tenvora.Api.Services;
public interface ISettlementService
{
 Task<SettlementBatchResponse> CreateDailySettlementBatchAsync(Guid tenantId, string currency);
 Task<SettlementBatchResponse?> SettleBatchAsync(Guid tenantId, Guid batchId);
 Task<List<SettlementBatchResponse>> GetBatchesAsync(Guid tenantId);
 Task<SettlementBatchResponse?> GetBatchByIdAsync(Guid tenantId, Guid batchId);
}
public class SettlementService : ISettlementService
{
 private readonly AppDbContext _context;
 public SettlementService(AppDbContext context) => _context = context;
 public async Task<SettlementBatchResponse> CreateDailySettlementBatchAsync(Guid tenantId, string currency)
 {
  currency = currency.Trim().ToUpperInvariant();
  if (currency.Length != 3 || !currency.All(char.IsAsciiLetter)) throw new InvalidOperationException("Choose a three-letter currency.");
  await using var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync() : null;
  await LockWorkspace(tenantId);
  var payments = await _context.Transactions.Where(t => t.TenantId == tenantId && t.Currency == currency && t.Status == "Posted" && !_context.SettlementEntries.Any(e => e.TenantId == tenantId && e.TransactionId == t.Id)).OrderBy(t => t.CreatedAt).ToListAsync();
  if (payments.Count == 0) throw new InvalidOperationException("No completed transactions are available for this currency.");
  var batch = new SettlementBatch { Id = Guid.NewGuid(), TenantId = tenantId, BatchNumber = $"BATCH-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..30], Currency = currency, Status = "Open", TotalTransactions = payments.Count, TotalDebitAmount = payments.Sum(p => p.Amount), TotalCreditAmount = payments.Sum(p => p.Amount), CreatedAt = DateTime.UtcNow };
  foreach (var payment in payments) batch.Entries.Add(new SettlementEntry { Id = Guid.NewGuid(), TenantId = tenantId, SettlementBatchId = batch.Id, TransactionId = payment.Id, Transaction = payment, CreatedAt = DateTime.UtcNow });
  _context.SettlementBatches.Add(batch);
  await _context.SaveChangesAsync();
  if (tx != null) await tx.CommitAsync();
  return Map(batch);
 }
 public async Task<SettlementBatchResponse?> SettleBatchAsync(Guid tenantId, Guid batchId)
 {
  await using var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync() : null;
  await LockWorkspace(tenantId);
  var batch = await Query(tenantId).FirstOrDefaultAsync(b => b.Id == batchId);
  if (batch == null) return null;
  if (batch.Status == "Settled") return Map(batch);
  if (batch.Status != "Open" || batch.Entries.Count == 0 || batch.Entries.Any(e => e.Transaction?.Status != "Posted")) throw new InvalidOperationException("This batch has transactions that are no longer eligible. Inspect its transactions before proceeding.");
  batch.Status = "Settled"; batch.SettledAt = DateTime.UtcNow;
  foreach (var entry in batch.Entries) { entry.Transaction!.Status = "Settled"; entry.Transaction.SettledAt = batch.SettledAt; }
  await _context.SaveChangesAsync();
  if (tx != null) await tx.CommitAsync();
  return Map(batch);
 }
 private async Task LockWorkspace(Guid tenantId)
 {
  if (_context.Database.IsRelational()) await _context.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({tenantId.ToString()}))");
 }
 private IQueryable<SettlementBatch> Query(Guid tenantId) => _context.SettlementBatches.Where(b => b.TenantId == tenantId).Include(b => b.Entries).ThenInclude(e => e.Transaction);
 public async Task<List<SettlementBatchResponse>> GetBatchesAsync(Guid tenantId) => (await Query(tenantId).AsNoTracking().OrderByDescending(b => b.CreatedAt).ToListAsync()).Select(Map).ToList();
 public async Task<SettlementBatchResponse?> GetBatchByIdAsync(Guid tenantId, Guid batchId) { var b = await Query(tenantId).AsNoTracking().FirstOrDefaultAsync(b => b.Id == batchId); return b == null ? null : Map(b); }
 private static SettlementBatchResponse Map(SettlementBatch b) => new(b.Id, b.TenantId, b.BatchNumber, b.TotalTransactions, b.TotalDebitAmount, b.TotalCreditAmount, b.Currency, b.Status, b.CreatedAt, b.SettledAt, b.Entries.Select(e => new SettlementTransactionResponse(e.TransactionId, e.Transaction?.ReferenceNumber ?? e.TransactionId.ToString(), e.Transaction?.Amount ?? 0, e.Transaction?.Status ?? "Unknown")).ToList());
}
