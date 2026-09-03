using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public interface ISettlementService
{
    Task<SettlementBatchResponse> CreateDailySettlementBatchAsync(Guid tenantId, string currency);
    Task<List<SettlementBatchResponse>> GetBatchesAsync(Guid tenantId);
    Task<SettlementBatchResponse?> GetBatchByIdAsync(Guid tenantId, Guid batchId);
}

public class SettlementService : ISettlementService
{
    private readonly ISettlementRepository _settlementRepository;

    public SettlementService(ISettlementRepository settlementRepository)
    {
        _settlementRepository = settlementRepository;
    }

    public async Task<SettlementBatchResponse> CreateDailySettlementBatchAsync(Guid tenantId, string currency)
    {
        var normalizedCurrency = currency.Trim().ToUpperInvariant();
        var pendingTxs = await _settlementRepository.GetUnsettledPostedTransactionsAsync(tenantId, normalizedCurrency);

        var batchNumber = $"BATCH-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        var totalDebits = pendingTxs.Sum(t => t.Amount);
        var totalCredits = totalDebits;

        var batch = new SettlementBatch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BatchNumber = batchNumber,
            TotalTransactions = pendingTxs.Count,
            TotalDebitAmount = totalDebits,
            TotalCreditAmount = totalCredits,
            Currency = normalizedCurrency,
            Status = "Settled",
            CreatedAt = DateTime.UtcNow,
            SettledAt = DateTime.UtcNow
        };

        await _settlementRepository.CreateBatchAsync(batch, pendingTxs.Select(t => t.Id));

        return new SettlementBatchResponse(
            batch.Id,
            batch.TenantId,
            batch.BatchNumber,
            batch.TotalTransactions,
            batch.TotalDebitAmount,
            batch.TotalCreditAmount,
            batch.Currency,
            batch.Status,
            batch.CreatedAt,
            batch.SettledAt
        );
    }

    public async Task<List<SettlementBatchResponse>> GetBatchesAsync(Guid tenantId)
    {
        var batches = await _settlementRepository.GetAllAsync(tenantId);
        return batches.Select(b => new SettlementBatchResponse(
            b.Id,
            b.TenantId,
            b.BatchNumber,
            b.TotalTransactions,
            b.TotalDebitAmount,
            b.TotalCreditAmount,
            b.Currency,
            b.Status,
            b.CreatedAt,
            b.SettledAt
        )).ToList();
    }

    public async Task<SettlementBatchResponse?> GetBatchByIdAsync(Guid tenantId, Guid batchId)
    {
        var b = await _settlementRepository.GetByIdAsync(tenantId, batchId);
        if (b == null) return null;

        return new SettlementBatchResponse(
            b.Id,
            b.TenantId,
            b.BatchNumber,
            b.TotalTransactions,
            b.TotalDebitAmount,
            b.TotalCreditAmount,
            b.Currency,
            b.Status,
            b.CreatedAt,
            b.SettledAt
        );
    }
}
