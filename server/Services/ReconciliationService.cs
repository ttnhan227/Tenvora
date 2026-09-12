using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

using Tenvora.Api.Common;

public interface IReconciliationService
{
    Task<ReconciliationResponse> RunReconciliationAsync(Guid tenantId, string? notes = null);
    Task<List<ReconciliationResponse>> GetReconciliationRunsAsync(Guid tenantId);
    Task<ReconciliationResponse?> GetReconciliationRunByIdAsync(Guid tenantId, Guid id);
    Task<ClientReconciliationResponse> ReconcileClientInvoicesAsync(Guid tenantId);
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
        await using var snapshot = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead)
            : null;
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
            var entries = allEntries.Where(e => e.AccountId == account.Id);
            var net = entries.Sum(e => e.DebitAmount - e.CreditAmount);
            var calculatedBalance = account.AccountType == "Asset" ? net : -net;

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
                    Reason = "The account balance differs from recorded activity. Inspect the account history.",
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
        if (snapshot != null) await snapshot.CommitAsync();

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

    public async Task<ClientReconciliationResponse> ReconcileClientInvoicesAsync(Guid tenantId)
    {
        var invoices = await _context.Invoices
            .Include(i => i.Client)
            .Include(i => i.Items)
            .Where(i => i.TenantId == tenantId)
            .ToListAsync();

        var transactions = await _context.Transactions
            .Where(t => t.TenantId == tenantId && t.Status == TransactionStatuses.Posted)
            .ToListAsync();

        var matchedInvoices = new List<InvoiceSummaryDto>();
        var unmatchedInvoices = new List<InvoiceSummaryDto>();
        decimal matchedAmount = 0m;

        var linkedTxIds = invoices.Where(i => i.PaymentTransactionId.HasValue).Select(i => i.PaymentTransactionId!.Value).ToHashSet();

        foreach (var invoice in invoices)
        {
            if (invoice.Status == "Paid" && invoice.PaymentTransactionId.HasValue)
            {
                matchedInvoices.Add(MapInvoice(invoice));
                matchedAmount += invoice.AmountPaid;
                continue;
            }

            var match = transactions.FirstOrDefault(t =>
                !linkedTxIds.Contains(t.Id) &&
                (t.ReferenceNumber.Contains(invoice.InvoiceNumber, StringComparison.OrdinalIgnoreCase) ||
                 (t.Description != null && t.Description.Contains(invoice.InvoiceNumber, StringComparison.OrdinalIgnoreCase)) ||
                 (t.Amount == invoice.TotalAmount && t.Currency == invoice.Currency && (t.Description != null && invoice.Client != null && t.Description.Contains(invoice.Client.Name, StringComparison.OrdinalIgnoreCase))))
            );

            if (match != null)
            {
                invoice.PaymentTransactionId = match.Id;
                invoice.Status = "Paid";
                invoice.AmountPaid = match.Amount;
                invoice.PaidAt = match.PostedAt ?? match.CreatedAt;
                invoice.UpdatedAt = DateTime.UtcNow;
                linkedTxIds.Add(match.Id);
                matchedInvoices.Add(MapInvoice(invoice));
                matchedAmount += match.Amount;
            }
            else
            {
                unmatchedInvoices.Add(MapInvoice(invoice));
            }
        }

        await _context.SaveChangesAsync();

        return new ClientReconciliationResponse(
            invoices.Count,
            matchedInvoices.Count,
            matchedAmount,
            unmatchedInvoices.Count,
            matchedInvoices,
            unmatchedInvoices
        );
    }

    private static InvoiceSummaryDto MapInvoice(Invoice i) => new(
        i.Id,
        i.InvoiceNumber,
        i.ClientId,
        i.Client?.Name ?? "Unknown Client",
        i.Client?.ContactEmail ?? "",
        i.IssueDate,
        i.DueDate,
        i.Currency,
        i.Subtotal,
        i.TaxRate,
        i.TaxAmount,
        i.TotalAmount,
        i.AmountPaid,
        i.Status,
        i.PaymentTerms,
        i.Notes,
        i.DestinationAccountId,
        i.PaymentTransactionId,
        i.PaidAt,
        i.ViewedAt,
        i.CreatedAt,
        i.Items.Select(item => new InvoiceItemDto(item.Id, item.Description, item.Quantity, item.UnitPrice, item.Amount)).ToList()
    );

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
