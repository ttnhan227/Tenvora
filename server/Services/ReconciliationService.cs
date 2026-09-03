using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public interface IReconciliationService
{
    Task<ReconciliationResponse> RunReconciliationAsync(Guid tenantId, string? notes = null);
    Task<List<ReconciliationResponse>> GetReconciliationRunsAsync(Guid tenantId);
    Task<ReconciliationResponse?> GetReconciliationRunByIdAsync(Guid tenantId, Guid id);
}

public class ReconciliationService : IReconciliationService
{
    private readonly AppDbContext _context;
    private readonly IReconciliationRepository _reconciliationRepository;
    private readonly ILedgerRepository _ledgerRepository;

    public ReconciliationService(
        AppDbContext context,
        IReconciliationRepository reconciliationRepository,
        ILedgerRepository ledgerRepository)
    {
        _context = context;
        _reconciliationRepository = reconciliationRepository;
        _ledgerRepository = ledgerRepository;
    }

    public async Task<ReconciliationResponse> RunReconciliationAsync(Guid tenantId, string? notes = null)
    {
        var runNumber = $"REC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        var accounts = await _context.Accounts.Where(a => a.TenantId == tenantId).ToListAsync();
        var allEntries = await _context.LedgerEntries.Where(l => l.TenantId == tenantId).ToListAsync();

        var run = new ReconciliationRun
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RunNumber = runNumber,
            StartedAt = DateTime.UtcNow,
            TotalAccountsChecked = accounts.Count,
            TotalLedgerEntriesChecked = allEntries.Count,
            Notes = notes ?? "Daily automated balance reconciliation"
        };

        var discrepancies = new List<ReconciliationDiscrepancy>();

        foreach (var account in accounts)
        {
            var calculatedBalance = await _ledgerRepository.CalculateDerivedBalanceAsync(
                tenantId, 
                account.Id, 
                account.AccountType);

            if (calculatedBalance != account.CachedBalance)
            {
                var discrepancy = new ReconciliationDiscrepancy
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ReconciliationRunId = run.Id,
                    AccountId = account.Id,
                    ExpectedBalance = account.CachedBalance,
                    CalculatedBalance = calculatedBalance,
                    DiscrepancyAmount = Math.Abs(calculatedBalance - account.CachedBalance),
                    Reason = $"Discrepancy detected: Cached balance is {account.CachedBalance} but ledger sum yields {calculatedBalance}",
                    Resolved = false,
                    CreatedAt = DateTime.UtcNow
                };
                discrepancies.Add(discrepancy);
            }
        }

        run.DiscrepancyCount = discrepancies.Count;
        run.Status = discrepancies.Count == 0 ? "Passed" : "DiscrepanciesFound";
        run.CompletedAt = DateTime.UtcNow;
        run.Discrepancies = discrepancies;

        await _reconciliationRepository.AddRunAsync(run);

        return MapReconciliation(run);
    }

    public async Task<List<ReconciliationResponse>> GetReconciliationRunsAsync(Guid tenantId)
    {
        var runs = await _reconciliationRepository.GetAllAsync(tenantId);
        return runs.Select(MapReconciliation).ToList();
    }

    public async Task<ReconciliationResponse?> GetReconciliationRunByIdAsync(Guid tenantId, Guid id)
    {
        var run = await _reconciliationRepository.GetByIdAsync(tenantId, id);
        if (run == null) return null;

        return MapReconciliation(run);
    }

    private static ReconciliationResponse MapReconciliation(ReconciliationRun r) => new(
        r.Id,
        r.TenantId,
        r.RunNumber,
        r.Status,
        r.TotalAccountsChecked,
        r.TotalLedgerEntriesChecked,
        r.DiscrepancyCount,
        r.Notes,
        r.StartedAt,
        r.CompletedAt,
        r.Discrepancies.Select(d => new ReconciliationDiscrepancyResponse(
            d.Id,
            d.AccountId,
            d.Account?.AccountNumber,
            d.ExpectedBalance,
            d.CalculatedBalance,
            d.DiscrepancyAmount,
            d.Reason,
            d.Resolved,
            d.CreatedAt
        )).ToList()
    );
}
