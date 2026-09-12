using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public class TaxService : ITaxService
{
    private readonly AppDbContext _dbContext;

    public TaxService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ApiResult<TaxSummaryDto>> GetTaxSummaryAsync(Guid tenantId)
    {
        var tenant = await _dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        var reportingCurrency = tenant?.BaseCurrency ?? "USD";

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && a.Status == AccountStatuses.Active)
            .ToListAsync();

        var taxVault = accounts.FirstOrDefault(a =>
            a.AccountNumber.StartsWith("TAX-VAULT-") && a.Currency == reportingCurrency);
        var taxVaultBalance = taxVault?.CachedBalance ?? 0m;

        var spendingAccounts = accounts.Where(a =>
            a.AccountType == AccountTypes.Asset &&
            a.Currency == reportingCurrency &&
            !a.AccountNumber.StartsWith("TAX-VAULT-"));
        var availableSpendingBalance = spendingAccounts.Sum(a => a.CachedBalance);

        var currentYear = DateTime.UtcNow.Year;
        var startOfYear = new DateTime(currentYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Compute YTD Gross Income from paid invoices and credited payments
        var ytdInvoices = await _dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId && i.Currency == reportingCurrency && i.AmountPaid > 0 && i.PaidAt >= startOfYear)
            .ToListAsync();

        var ytdGrossIncome = ytdInvoices.Sum(i => i.AmountPaid);
        var taxRatePercent = tenant?.DefaultTaxSetAsideRate ?? 25.0m;
        var estimatedAnnualLiability = Math.Round(ytdGrossIncome * (taxRatePercent / 100m), 2);
        var estimatedQuarterLiability = Math.Round(estimatedAnnualLiability / 4m, 2);

        // Compute recent tax set-asides
        var taxTransactions = await _dbContext.Transactions
            .AsNoTracking()
            .Where(t => t.TenantId == tenantId && t.Currency == reportingCurrency && (t.ReferenceNumber.StartsWith("TAX-") || (t.Description != null && t.Description.ToLower().Contains("tax"))))
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .ToListAsync();

        var recentTaxSetAsides = taxTransactions.Select(t => new TaxTransferRecordDto(
            t.Id,
            t.ReferenceNumber,
            t.Amount,
            t.Currency,
            t.Description ?? "Tax set-aside transfer",
            t.CreatedAt
        )).ToList();

        var ytdTaxSetAsideTotal = taxVault == null ? 0m : await _dbContext.LedgerEntries
            .Where(l => l.TenantId == tenantId && l.AccountId == taxVault.Id && l.PostedAt >= startOfYear)
            .SumAsync(l => l.DebitAmount);

        // Quarterly Schedule for Current Year
        var now = DateTime.UtcNow;
        var q1Due = new DateTime(currentYear, 4, 15, 23, 59, 59, DateTimeKind.Utc);
        var q2Due = new DateTime(currentYear, 6, 15, 23, 59, 59, DateTimeKind.Utc);
        var q3Due = new DateTime(currentYear, 9, 15, 23, 59, 59, DateTimeKind.Utc);
        var q4Due = new DateTime(currentYear + 1, 1, 15, 23, 59, 59, DateTimeKind.Utc);

        var schedule = new List<QuarterlyScheduleItemDto>
        {
            new("Q1", "Jan 1 – Mar 31", q1Due, estimatedQuarterLiability, now > q1Due ? "Overdue" : "Upcoming"),
            new("Q2", "Apr 1 – May 31", q2Due, estimatedQuarterLiability, now > q2Due ? "Overdue" : now >= q1Due ? "Upcoming" : "Upcoming"),
            new("Q3", "Jun 1 – Aug 31", q3Due, estimatedQuarterLiability, now > q3Due ? "Overdue" : "Upcoming"),
            new("Q4", "Sep 1 – Dec 31", q4Due, estimatedQuarterLiability, "Upcoming")
        };

        // Determine current quarter deadline
        string currentQuarter = "Q1";
        DateTime nextQuarterDeadline = q1Due;

        if (now <= q1Due)
        {
            currentQuarter = "Q1";
            nextQuarterDeadline = q1Due;
        }
        else if (now <= q2Due)
        {
            currentQuarter = "Q2";
            nextQuarterDeadline = q2Due;
        }
        else if (now <= q3Due)
        {
            currentQuarter = "Q3";
            nextQuarterDeadline = q3Due;
        }
        else
        {
            currentQuarter = "Q4";
            nextQuarterDeadline = q4Due;
        }

        var daysUntil = (int)Math.Max(0, (nextQuarterDeadline - now).TotalDays);

        var dto = new TaxSummaryDto(
            reportingCurrency,
            availableSpendingBalance,
            taxVaultBalance,
            taxRatePercent,
            tenant?.AutoTaxSetAsideEnabled ?? true,
            tenant?.FilingStatus ?? "Single",
            tenant?.PersonalTaxIdLast4,
            ytdGrossIncome,
            ytdTaxSetAsideTotal,
            estimatedAnnualLiability,
            estimatedQuarterLiability,
            currentQuarter,
            nextQuarterDeadline,
            daysUntil,
            schedule,
            recentTaxSetAsides
        );

        return ApiResult<TaxSummaryDto>.Ok(dto);
    }

    public async Task<ApiResult<bool>> UpdateTaxSettingsAsync(Guid tenantId, UpdateTaxSettingsRequest request)
    {
        var tenant = await _dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null)
        {
            return ApiResult<bool>.Fail("Tenant not found");
        }

        if (request.DefaultTaxRatePercent.HasValue)
        {
            tenant.DefaultTaxSetAsideRate = Math.Clamp(request.DefaultTaxRatePercent.Value, 0m, 60m);
        }

        if (request.AutoTaxSetAsideEnabled.HasValue)
        {
            tenant.AutoTaxSetAsideEnabled = request.AutoTaxSetAsideEnabled.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.FilingStatus))
        {
            tenant.FilingStatus = request.FilingStatus.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.PersonalTaxIdLast4))
        {
            tenant.PersonalTaxIdLast4 = request.PersonalTaxIdLast4.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedExternalBankName))
        {
            tenant.LinkedExternalBankName = request.LinkedExternalBankName.Trim();
        }

        tenant.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return ApiResult<bool>.Ok(true);
    }

    public async Task<ApiResult<TaxTransferRecordDto>> ManualTaxTransferAsync(Guid tenantId, ManualTaxTransferRequest request)
    {
        if (request.Amount <= 0)
        {
            return ApiResult<TaxTransferRecordDto>.Fail("Transfer amount must be greater than zero");
        }

        if (request.Direction is not ("ToTaxVault" or "ToSpendingWallet") || decimal.Round(request.Amount, 4) != request.Amount)
            return ApiResult<TaxTransferRecordDto>.Fail("Choose a valid transfer direction and amount with at most four decimal places.");
        await using var write = await FinancialWriteScope.BeginAsync(_dbContext, tenantId);
        var tenant = await _dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        var reportingCurrency = tenant?.BaseCurrency ?? "USD";

        var accounts = await _dbContext.Accounts
            .Where(a => a.TenantId == tenantId && a.Status == AccountStatuses.Active)
            .ToListAsync();

        var mainWallet = accounts.FirstOrDefault(a =>
                             a.Currency == reportingCurrency &&
                             (a.AccountNumber.StartsWith("MAIN-") || a.AccountNumber.StartsWith("OP-")))
                         ?? accounts.FirstOrDefault(a => a.AccountType == AccountTypes.Asset && a.Currency == reportingCurrency);

        var taxVault = accounts.FirstOrDefault(a =>
            a.AccountNumber.StartsWith("TAX-VAULT-") && a.Currency == reportingCurrency);

        if (mainWallet == null || taxVault == null)
        {
            return ApiResult<TaxTransferRecordDto>.Fail("Required operating and tax-reserve categories were not found");
        }

        if (mainWallet.Id == taxVault.Id || mainWallet.Currency != taxVault.Currency || mainWallet.AccountType != AccountTypes.Asset || taxVault.AccountType != AccountTypes.Asset)
            return ApiResult<TaxTransferRecordDto>.Fail("Use distinct asset wallets in the same currency.");
        var isDeposit = request.Direction == "ToTaxVault";
        var source = isDeposit ? mainWallet : taxVault;
        var destination = isDeposit ? taxVault : mainWallet;

        if (source.CachedBalance < request.Amount)
        {
            return ApiResult<TaxTransferRecordDto>.Fail($"Insufficient recorded balance in {(isDeposit ? "the operating category" : "the tax-reserve category")}");
        }

        source.CachedBalance -= request.Amount;
        destination.CachedBalance += request.Amount;
        source.UpdatedAt = DateTime.UtcNow;
        destination.UpdatedAt = DateTime.UtcNow;

        var txId = Guid.NewGuid();
        var txRef = $"TAX-{(isDeposit ? "DEP" : "WTH")}-{Guid.NewGuid():N}";
        var desc = isDeposit
            ? $"Manual allocation to tax reserve: {request.Amount:N2} {mainWallet.Currency}"
            : $"Manual release from tax reserve: {request.Amount:N2} {mainWallet.Currency}";

        var tx = new Transaction
        {
            Id = txId,
            TenantId = tenantId,
            ReferenceNumber = txRef,
            TransactionType = "TaxTransfer",
            Status = TransactionStatuses.Posted,
            Amount = request.Amount,
            Currency = mainWallet.Currency,
            Description = desc,
            CreatedAt = DateTime.UtcNow,
            PostedAt = DateTime.UtcNow,
            SettledAt = DateTime.UtcNow
        };

        _dbContext.Transactions.Add(tx);

        _dbContext.LedgerEntries.Add(new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TransactionId = txId,
            AccountId = source.Id,
            EntryType = "Credit",
            DebitAmount = 0m,
            CreditAmount = request.Amount,
            Currency = mainWallet.Currency,
            PostedAt = DateTime.UtcNow,
            Description = desc
        });

        _dbContext.LedgerEntries.Add(new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TransactionId = txId,
            AccountId = destination.Id,
            EntryType = "Debit",
            DebitAmount = request.Amount,
            CreditAmount = 0m,
            Currency = mainWallet.Currency,
            PostedAt = DateTime.UtcNow,
            Description = desc
        });

        await _dbContext.SaveChangesAsync();

        var resultDto = new TaxTransferRecordDto(
            txId,
            txRef,
            request.Amount,
            mainWallet.Currency,
            desc,
            DateTime.UtcNow
        );

        if (write != null) await write.CommitAsync();
        return ApiResult<TaxTransferRecordDto>.Ok(resultDto);
    }
}
