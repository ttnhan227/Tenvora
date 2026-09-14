using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed class ExpenseService(AppDbContext db) : IExpenseService
{
    public async Task<ApiResult<List<ExpenseDto>>> GetAsync(Guid tenantId, string? search, string? category, string? status, DateTime? from, DateTime? to)
    {
        var query = db.Expenses.AsNoTracking().Where(e => e.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e => e.Merchant.ToLower().Contains(term) ||
                (e.Description != null && e.Description.ToLower().Contains(term)) ||
                (e.Reference != null && e.Reference.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(e => e.Status == status);
        if (from.HasValue) query = query.Where(e => e.ExpenseDate >= from.Value.Date);
        if (to.HasValue) query = query.Where(e => e.ExpenseDate < to.Value.Date.AddDays(1));
        var rows = await query.Include(e => e.Client).Include(e => e.Project)
            .OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.CreatedAt).Take(500).ToListAsync();
        return ApiResult<List<ExpenseDto>>.Ok(rows.Select(Map).ToList());
    }

    public async Task<ApiResult<ExpenseSummaryDto>> GetSummaryAsync(Guid tenantId, DateTime? from, DateTime? to)
    {
        var currency = await db.Tenants.Where(t => t.Id == tenantId).Select(t => t.BaseCurrency).FirstOrDefaultAsync() ?? "USD";
        var start = from?.Date ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = to?.Date.AddDays(1) ?? DateTime.UtcNow.Date.AddDays(1);
        var rows = await db.Expenses.AsNoTracking().Where(e => e.TenantId == tenantId && e.Currency == currency &&
            e.Status == ExpenseStatuses.Posted && e.ExpenseDate >= start && e.ExpenseDate < end).ToListAsync();
        var groups = rows.GroupBy(e => e.Category).OrderByDescending(g => g.Sum(e => e.Amount))
            .Select(g => new ExpenseCategoryTotalDto(g.Key, g.Sum(e => e.Amount), g.Count())).ToList();
        return ApiResult<ExpenseSummaryDto>.Ok(new(currency, rows.Sum(e => e.Amount), rows.Count, groups));
    }

    public async Task<ApiResult<ExpenseDto>> CreateAsync(Guid tenantId, string idempotencyKey, CreateExpenseRequest request)
    {
        idempotencyKey = idempotencyKey.Trim();
        var hash = Hash(request);
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.Expenses.Include(e => e.Client).Include(e => e.Project)
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != hash) return ApiResult<ExpenseDto>.Fail("This idempotency key was already used for a different expense.");
            if (write != null) await write.CommitAsync();
            return ApiResult<ExpenseDto>.Ok(Map(existing));
        }

        var error = Validate(request);
        if (error != null) return ApiResult<ExpenseDto>.Fail(error);
        var currency = request.Currency.Trim().ToUpperInvariant();
        var source = await db.Accounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == request.AccountId &&
            a.AccountType == AccountTypes.Asset && a.Status == AccountStatuses.Active && a.Currency == currency);
        if (source == null) return ApiResult<ExpenseDto>.Fail("Choose an active operating account in the expense currency.");
        if (source.CachedBalance < request.Amount) return ApiResult<ExpenseDto>.Fail("The recorded account balance is too low for this expense.");

        Client? client = null;
        if (request.ClientId.HasValue)
        {
            client = await db.Clients.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.ClientId);
            if (client == null) return ApiResult<ExpenseDto>.Fail("The selected client was not found in this workspace.");
        }
        Project? project = null;
        if (request.ProjectId.HasValue)
        {
            project = await db.Projects.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.ProjectId);
            if (project == null) return ApiResult<ExpenseDto>.Fail("The selected project was not found in this workspace.");
            if (client != null && project.ClientId != client.Id) return ApiResult<ExpenseDto>.Fail("The selected project does not belong to this client.");
            if (project.Currency != currency) return ApiResult<ExpenseDto>.Fail("Expense currency must match the selected project.");
            client ??= await db.Clients.FirstAsync(c => c.TenantId == tenantId && c.Id == project.ClientId);
        }

        var expenseAccountNumber = $"EXPENSE-{currency}";
        var expenseAccount = await db.Accounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AccountNumber == expenseAccountNumber);
        if (expenseAccount == null)
        {
            expenseAccount = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = expenseAccountNumber,
                AccountType = AccountTypes.Expense, Currency = currency, Status = AccountStatuses.Active };
            db.Accounts.Add(expenseAccount);
        }

        var now = DateTime.UtcNow;
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(), TenantId = tenantId, ReferenceNumber = $"EXP-{Guid.NewGuid():N}",
            TransactionType = TransactionTypes.Expense, Status = TransactionStatuses.Posted,
            Amount = decimal.Round(request.Amount, 4, MidpointRounding.AwayFromZero), Currency = currency,
            Description = $"{request.Merchant.Trim()}{(string.IsNullOrWhiteSpace(request.Description) ? string.Empty : $" — {request.Description.Trim()}")}",
            Category = request.Category.Trim(), RelatedEntityType = "Expense", CreatedAt = now, PostedAt = now, SettledAt = now
        };
        var expense = new Expense
        {
            Id = Guid.NewGuid(), TenantId = tenantId, AccountId = source.Id, TransactionId = transaction.Id,
            ClientId = client?.Id, ProjectId = project?.Id, Merchant = request.Merchant.Trim(), Category = request.Category.Trim(),
            Description = Clean(request.Description), Reference = Clean(request.Reference), Amount = transaction.Amount,
            Currency = currency, ExpenseDate = request.ExpenseDate == default ? now : request.ExpenseDate,
            Status = ExpenseStatuses.Posted, IdempotencyKey = idempotencyKey, RequestHash = hash, CreatedAt = now, UpdatedAt = now
        };
        transaction.RelatedEntityId = expense.Id;
        source.CachedBalance -= expense.Amount;
        source.UpdatedAt = now;
        expenseAccount.CachedBalance += expense.Amount;
        expenseAccount.UpdatedAt = now;
        db.Transactions.Add(transaction);
        db.Expenses.Add(expense);
        db.LedgerEntries.AddRange(
            new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = transaction.Id, AccountId = expenseAccount.Id,
                EntryType = "Debit", DebitAmount = expense.Amount, Currency = currency, PostedAt = now, Description = expense.Description ?? expense.Merchant },
            new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = transaction.Id, AccountId = source.Id,
                EntryType = "Credit", CreditAmount = expense.Amount, Currency = currency, PostedAt = now, Description = expense.Description ?? expense.Merchant });
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        expense.Client = client;
        expense.Project = project;
        return ApiResult<ExpenseDto>.Ok(Map(expense));
    }

    public async Task<ApiResult<ExpenseDto>> VoidAsync(Guid tenantId, Guid id, VoidExpenseRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var expense = await db.Expenses.Include(e => e.Client).Include(e => e.Project)
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id);
        if (expense == null) return ApiResult<ExpenseDto>.Fail("Expense not found.");
        if (expense.Status == ExpenseStatuses.Void) return ApiResult<ExpenseDto>.Fail("This expense has already been voided.");
        var original = await db.Transactions.Include(t => t.LedgerEntries)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == expense.TransactionId);
        if (original == null) return ApiResult<ExpenseDto>.Fail("The expense journal record could not be found.");
        var accountIds = original.LedgerEntries.Select(e => e.AccountId).Distinct().ToList();
        var accounts = await db.Accounts.Where(a => a.TenantId == tenantId && accountIds.Contains(a.Id)).ToDictionaryAsync(a => a.Id);
        if (accounts.Count != accountIds.Count) return ApiResult<ExpenseDto>.Fail("An expense account could not be found.");

        var now = DateTime.UtcNow;
        var reversal = new Transaction { Id = Guid.NewGuid(), TenantId = tenantId, ReferenceNumber = $"VOID-{Guid.NewGuid():N}",
            TransactionType = TransactionTypes.Reversal, Status = TransactionStatuses.Posted, OriginalTransactionId = original.Id,
            Amount = expense.Amount, Currency = expense.Currency, Description = string.IsNullOrWhiteSpace(request.Reason) ? $"Void expense: {expense.Merchant}" : request.Reason.Trim(),
            Category = expense.Category, RelatedEntityType = "Expense", RelatedEntityId = expense.Id, CreatedAt = now, PostedAt = now };
        db.Transactions.Add(reversal);
        foreach (var line in original.LedgerEntries)
        {
            var reversedDebit = line.CreditAmount;
            var reversedCredit = line.DebitAmount;
            db.LedgerEntries.Add(new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = reversal.Id,
                AccountId = line.AccountId, EntryType = reversedDebit > 0 ? "Debit" : "Credit", DebitAmount = reversedDebit,
                CreditAmount = reversedCredit, Currency = line.Currency, PostedAt = now, Description = reversal.Description });
            var account = accounts[line.AccountId];
            account.CachedBalance += reversedDebit - reversedCredit;
            account.UpdatedAt = now;
        }
        original.Status = TransactionStatuses.Reversed;
        expense.Status = ExpenseStatuses.Void;
        expense.VoidedAt = now;
        expense.UpdatedAt = now;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<ExpenseDto>.Ok(Map(expense));
    }

    private static string? Validate(CreateExpenseRequest request)
    {
        if (request.Amount <= 0 || decimal.Round(request.Amount, 4) != request.Amount) return "Amount must be greater than zero with at most four decimal places.";
        if (string.IsNullOrWhiteSpace(request.Merchant)) return "Merchant is required.";
        if (!ExpenseCategories.All.Contains(request.Category?.Trim() ?? string.Empty)) return "Choose a supported expense category.";
        if (string.IsNullOrWhiteSpace(request.Currency) || request.Currency.Trim().Length != 3) return "Currency must be a three-letter code.";
        if (request.ExpenseDate > DateTime.UtcNow.AddDays(1)) return "Expense date cannot be in the future.";
        return null;
    }

    private static string Hash(CreateExpenseRequest request)
    {
        var raw = JsonSerializer.Serialize(request);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static ExpenseDto Map(Expense e) => new(e.Id, e.AccountId, e.TransactionId, e.ClientId, e.Client?.Name,
        e.ProjectId, e.Project?.Name, e.Merchant, e.Category, e.Description, e.Reference, e.Amount, e.Currency,
        e.ExpenseDate, e.Status, e.CreatedAt, e.VoidedAt);
}
