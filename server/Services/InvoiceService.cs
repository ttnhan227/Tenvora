using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public sealed class InvoiceService(AppDbContext db) : IInvoiceService
{
    public async Task<ApiResult<List<InvoiceSummaryDto>>> GetInvoicesAsync(Guid tenantId, string? status = null, Guid? clientId = null)
    {
        var query = db.Invoices.AsNoTracking().Where(i => i.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status == InvoiceStatuses.Overdue)
                query = query.Where(i => i.DueDate < DateTime.UtcNow && i.AmountPaid < i.TotalAmount && i.Status != InvoiceStatuses.Draft && i.Status != InvoiceStatuses.Cancelled);
            else
                query = query.Where(i => i.Status == status);
        }
        if (clientId.HasValue && clientId != Guid.Empty) query = query.Where(i => i.ClientId == clientId);
        var invoices = await query.Include(i => i.Client).Include(i => i.Project).Include(i => i.Items).Include(i => i.Payments)
            .OrderByDescending(i => i.CreatedAt).ToListAsync();
        return ApiResult<List<InvoiceSummaryDto>>.Ok(invoices.Select(MapToDto).ToList());
    }

    public async Task<ApiResult<InvoiceSummaryDto>> GetInvoiceByIdAsync(Guid tenantId, Guid invoiceId)
    {
        var invoice = await db.Invoices.AsNoTracking().Include(i => i.Client).Include(i => i.Project)
            .Include(i => i.Items).Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId);
        return invoice == null ? ApiResult<InvoiceSummaryDto>.Fail("Invoice not found.") : ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<InvoiceStatsDto>> GetInvoiceStatsAsync(Guid tenantId)
    {
        var currency = await db.Tenants.AsNoTracking().Where(t => t.Id == tenantId).Select(t => t.BaseCurrency).FirstOrDefaultAsync() ?? "USD";
        var invoices = await db.Invoices.AsNoTracking().Where(i => i.TenantId == tenantId && i.Currency == currency).ToListAsync();
        var financial = invoices.Where(i => i.Status != InvoiceStatuses.Cancelled).ToList();
        var outstanding = financial.Where(IsOutstanding).ToList();
        return ApiResult<InvoiceStatsDto>.Ok(new(currency, financial.Sum(i => i.TotalAmount), financial.Sum(i => i.AmountPaid),
            outstanding.Sum(i => i.TotalAmount - i.AmountPaid), invoices.Count, outstanding.Count,
            invoices.Count(i => i.Status == InvoiceStatuses.Paid), outstanding.Count(i => EffectiveStatus(i) == InvoiceStatuses.Overdue)));
    }

    public async Task<ApiResult<InvoiceSummaryDto>> CreateInvoiceAsync(Guid tenantId, CreateInvoiceRequest request)
    {
        if (request.Items == null || request.Items.Count == 0) return ApiResult<InvoiceSummaryDto>.Fail("Add at least one line item.");
        if (request.Items.Any(i => i.Quantity <= 0 || i.UnitPrice <= 0 || decimal.Round(i.Quantity, 4) != i.Quantity ||
            decimal.Round(i.UnitPrice, 4) != i.UnitPrice || string.IsNullOrWhiteSpace(i.Description)))
            return ApiResult<InvoiceSummaryDto>.Fail("Each line item needs a description, positive quantity, and positive price with at most four decimal places.");
        if (request.TaxRate is < 0 or > 100 || request.TaxRate.HasValue && decimal.Round(request.TaxRate.Value, 4) != request.TaxRate.Value)
            return ApiResult<InvoiceSummaryDto>.Fail("Tax rate must be from 0 to 100 with at most four decimal places.");

        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var client = await db.Clients.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.ClientId && c.Status != "Archived");
        if (client == null) return ApiResult<InvoiceSummaryDto>.Fail("Choose an active client in this workspace.");
        Project? project = null;
        if (request.ProjectId.HasValue)
        {
            project = await db.Projects.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.ProjectId && p.ClientId == client.Id && p.Status != ProjectStatuses.Archived);
            if (project == null) return ApiResult<InvoiceSummaryDto>.Fail("Choose an active project that belongs to this client.");
        }
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? client.Currency : request.Currency.Trim().ToUpperInvariant();
        if (currency.Length != 3) return ApiResult<InvoiceSummaryDto>.Fail("Currency must be a three-letter code.");
        if (currency != client.Currency || project != null && currency != project.Currency)
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice currency must match the selected client and project.");
        var destination = request.DestinationAccountId.HasValue
            ? await db.Accounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == request.DestinationAccountId && a.AccountType == AccountTypes.Asset && a.Status == AccountStatuses.Active && a.Currency == currency)
            : await db.Accounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AccountType == AccountTypes.Asset && a.Status == AccountStatuses.Active && a.Currency == currency && !a.AccountNumber.StartsWith("TAX-VAULT-"));
        if (destination == null) return ApiResult<InvoiceSummaryDto>.Fail("Create an active operating account in this currency before invoicing.");

        var issueDate = request.IssueDate ?? DateTime.UtcNow;
        var dueDate = request.DueDate ?? issueDate.AddDays(client.DefaultPaymentTermsDays > 0 ? client.DefaultPaymentTermsDays : 14);
        if (dueDate < issueDate) return ApiResult<InvoiceSummaryDto>.Fail("Due date cannot be before issue date.");
        var invoiceNumber = string.IsNullOrWhiteSpace(request.InvoiceNumber)
            ? $"INV-{DateTime.UtcNow.Year}-{await db.Invoices.CountAsync(i => i.TenantId == tenantId) + 1:D3}"
            : request.InvoiceNumber.Trim();
        if (await db.Invoices.AnyAsync(i => i.TenantId == tenantId && i.InvoiceNumber == invoiceNumber))
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice number already exists.");

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(), TenantId = tenantId, ClientId = client.Id, ProjectId = project?.Id,
            InvoiceNumber = invoiceNumber, IssueDate = issueDate, DueDate = dueDate, Currency = currency,
            PaymentTerms = string.IsNullOrWhiteSpace(request.PaymentTerms) ? $"Net {client.DefaultPaymentTermsDays}" : request.PaymentTerms.Trim(),
            Notes = Clean(request.Notes), DestinationAccountId = destination.Id, Status = InvoiceStatuses.Draft
        };
        foreach (var item in request.Items)
        {
            var amount = Money(item.Quantity * item.UnitPrice);
            invoice.Items.Add(new InvoiceItem { Id = Guid.NewGuid(), InvoiceId = invoice.Id, Description = item.Description.Trim(),
                Quantity = item.Quantity, UnitPrice = item.UnitPrice, Amount = amount });
        }
        invoice.Subtotal = Money(invoice.Items.Sum(i => i.Amount));
        invoice.TaxRate = request.TaxRate ?? 0m;
        invoice.TaxAmount = Money(Money(invoice.Subtotal * invoice.TaxRate) / 100m);
        invoice.TotalAmount = Money(invoice.Subtotal + invoice.TaxAmount);
        if (invoice.TotalAmount <= 0) return ApiResult<InvoiceSummaryDto>.Fail("Invoice total must be greater than zero.");
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        invoice.Client = client;
        invoice.Project = project;
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<InvoiceSummaryDto>> SendInvoiceAsync(Guid tenantId, Guid invoiceId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var invoice = await FindForWrite(tenantId, invoiceId);
        if (invoice == null) return ApiResult<InvoiceSummaryDto>.Fail("Invoice not found.");
        if (invoice.Status != InvoiceStatuses.Draft) return ApiResult<InvoiceSummaryDto>.Fail("Only a draft invoice can be sent.");
        invoice.Status = InvoiceStatuses.Sent;
        invoice.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public Task<ApiResult<InvoiceSummaryDto>> PayInvoiceAsync(Guid tenantId, Guid invoiceId, PayInvoiceRequest request) =>
        PayInvoiceAsync(tenantId, invoiceId, $"internal-{Guid.NewGuid():N}", request);

    public async Task<ApiResult<InvoiceSummaryDto>> PayInvoiceAsync(Guid tenantId, Guid invoiceId, string idempotencyKey, PayInvoiceRequest request)
    {
        idempotencyKey = idempotencyKey.Trim();
        var requestHash = Hash(invoiceId, request);
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var existing = await db.InvoicePayments.AsNoTracking().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IdempotencyKey == idempotencyKey);
        if (existing != null)
        {
            if (existing.RequestHash != requestHash) return ApiResult<InvoiceSummaryDto>.Fail("This idempotency key was already used for a different payment.");
            var replay = await FindForWrite(tenantId, existing.InvoiceId);
            if (write != null) await write.CommitAsync();
            return replay == null ? ApiResult<InvoiceSummaryDto>.Fail("Invoice not found.") : ApiResult<InvoiceSummaryDto>.Ok(MapToDto(replay));
        }

        var invoice = await FindForWrite(tenantId, invoiceId);
        if (invoice == null) return ApiResult<InvoiceSummaryDto>.Fail("Invoice not found.");
        var effectiveStatus = EffectiveStatus(invoice);
        if (!InvoiceStatuses.CanReceivePayment(effectiveStatus))
            return ApiResult<InvoiceSummaryDto>.Fail(effectiveStatus == InvoiceStatuses.Draft ? "Send the invoice before recording payment." : "This invoice cannot receive a payment in its current state.");
        var remaining = invoice.TotalAmount - invoice.AmountPaid;
        var amount = request.Amount ?? remaining;
        if (amount <= 0 || amount > remaining || decimal.Round(amount, 4) != amount)
            return ApiResult<InvoiceSummaryDto>.Fail("Payment must be positive, may have at most four decimal places, and cannot exceed the outstanding amount.");

        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
        var accounts = await db.Accounts.Where(a => a.TenantId == tenantId && a.Status == AccountStatuses.Active).ToListAsync();
        var wallet = accounts.FirstOrDefault(a => a.Id == invoice.DestinationAccountId && a.AccountType == AccountTypes.Asset && a.Currency == invoice.Currency);
        if (wallet == null) return ApiResult<InvoiceSummaryDto>.Fail("Invoice destination account must be active and use the invoice currency.");
        var income = accounts.FirstOrDefault(a => a.AccountNumber == $"INCOME-{invoice.Currency}");
        if (income == null)
        {
            income = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = $"INCOME-{invoice.Currency}",
                AccountType = AccountTypes.Equity, Currency = invoice.Currency, Status = AccountStatuses.Active };
            db.Accounts.Add(income);
        }

        var now = DateTime.UtcNow;
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(), TenantId = tenantId, ReferenceNumber = $"PAY-{Guid.NewGuid():N}",
            TransactionType = TransactionTypes.InvoicePayment, Status = TransactionStatuses.Posted,
            Amount = amount, Currency = invoice.Currency, Description = $"Payment from {invoice.Client?.Name ?? "client"} for {invoice.InvoiceNumber}",
            Category = "Client income", RelatedEntityType = "Invoice", RelatedEntityId = invoice.Id,
            CreatedAt = now, PostedAt = now, SettledAt = now
        };
        db.Transactions.Add(transaction);
        db.LedgerEntries.AddRange(
            new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = transaction.Id, AccountId = wallet.Id,
                EntryType = "Debit", DebitAmount = amount, Currency = invoice.Currency, PostedAt = now, Description = transaction.Description },
            new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = transaction.Id, AccountId = income.Id,
                EntryType = "Credit", CreditAmount = amount, Currency = invoice.Currency, PostedAt = now, Description = "Invoice income" });
        wallet.CachedBalance += amount;
        wallet.UpdatedAt = now;
        income.CachedBalance += amount;
        income.UpdatedAt = now;

        var payment = new InvoicePayment { Id = Guid.NewGuid(), TenantId = tenantId, InvoiceId = invoice.Id,
            TransactionId = transaction.Id, Amount = amount, Currency = invoice.Currency, IdempotencyKey = idempotencyKey,
            RequestHash = requestHash, Reference = Clean(request.Reference), PaidAt = now, CreatedAt = now };
        db.InvoicePayments.Add(payment);
        invoice.AmountPaid = Money(invoice.AmountPaid + amount);
        invoice.Status = invoice.AmountPaid == invoice.TotalAmount ? InvoiceStatuses.Paid : InvoiceStatuses.PartiallyPaid;
        invoice.PaidAt = invoice.Status == InvoiceStatuses.Paid ? now : null;
        invoice.PaymentTransactionId = transaction.Id;
        invoice.UpdatedAt = now;

        if (request.AutoTaxSetAside && tenant?.AutoTaxSetAsideEnabled == true)
            AddTaxAllocation(tenantId, invoice, wallet, accounts, tenant.DefaultTaxSetAsideRate, amount, now);

        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<InvoiceSummaryDto>> CancelInvoiceAsync(Guid tenantId, Guid invoiceId, CancelInvoiceRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var invoice = await FindForWrite(tenantId, invoiceId);
        if (invoice == null) return ApiResult<InvoiceSummaryDto>.Fail("Invoice not found.");
        if (invoice.AmountPaid > 0) return ApiResult<InvoiceSummaryDto>.Fail("An invoice with payment history cannot be cancelled. Preserve the record and issue an adjustment instead.");
        if (invoice.Status is InvoiceStatuses.Paid or InvoiceStatuses.Cancelled) return ApiResult<InvoiceSummaryDto>.Fail("This invoice cannot be cancelled in its current state.");
        invoice.Status = InvoiceStatuses.Cancelled;
        invoice.Notes = string.IsNullOrWhiteSpace(request.Reason) ? invoice.Notes : $"{invoice.Notes}\nCancelled: {request.Reason.Trim()}".Trim();
        invoice.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<bool>> DeleteInvoiceAsync(Guid tenantId, Guid invoiceId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);
        var invoice = await db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId);
        if (invoice == null) return ApiResult<bool>.Fail("Invoice not found.");
        if (invoice.Status != InvoiceStatuses.Draft || invoice.AmountPaid > 0)
            return ApiResult<bool>.Fail("Only an unpaid draft invoice can be deleted. Cancel an issued invoice to preserve history.");
        db.Invoices.Remove(invoice);
        await db.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<bool>.Ok(true);
    }

    private async Task<Invoice?> FindForWrite(Guid tenantId, Guid id) => await db.Invoices
        .Include(i => i.Client).Include(i => i.Project).Include(i => i.Items).Include(i => i.Payments)
        .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == id);

    private void AddTaxAllocation(Guid tenantId, Invoice invoice, Account wallet, List<Account> accounts, decimal rate, decimal paymentAmount, DateTime now)
    {
        var amount = Money(paymentAmount * rate / 100m);
        if (amount <= 0 || wallet.CachedBalance < amount) return;
        var vault = accounts.FirstOrDefault(a => a.AccountNumber.StartsWith("TAX-VAULT-") && a.Currency == invoice.Currency);
        if (vault == null)
        {
            vault = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = $"TAX-VAULT-{tenantId.ToString("N")[..8]}-{invoice.Currency}",
                AccountType = AccountTypes.Asset, Currency = invoice.Currency, Status = AccountStatuses.Active };
            db.Accounts.Add(vault);
            accounts.Add(vault);
        }
        if (vault.Id == wallet.Id) return;
        var tx = new Transaction { Id = Guid.NewGuid(), TenantId = tenantId, ReferenceNumber = $"TAX-{Guid.NewGuid():N}",
            TransactionType = "TaxTransfer", Status = TransactionStatuses.Posted, Amount = amount, Currency = invoice.Currency,
            Description = $"Tax reserve allocation for {invoice.InvoiceNumber}", Category = "Tax reserve", RelatedEntityType = "Invoice", RelatedEntityId = invoice.Id,
            CreatedAt = now, PostedAt = now, SettledAt = now };
        wallet.CachedBalance -= amount;
        vault.CachedBalance += amount;
        wallet.UpdatedAt = vault.UpdatedAt = now;
        db.Transactions.Add(tx);
        db.LedgerEntries.AddRange(
            new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = tx.Id, AccountId = wallet.Id, EntryType = "Credit", CreditAmount = amount, Currency = invoice.Currency, PostedAt = now, Description = tx.Description },
            new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = tx.Id, AccountId = vault.Id, EntryType = "Debit", DebitAmount = amount, Currency = invoice.Currency, PostedAt = now, Description = tx.Description });
    }

    private static bool IsOutstanding(Invoice i) => i.AmountPaid < i.TotalAmount && i.Status is not InvoiceStatuses.Draft and not InvoiceStatuses.Cancelled;
    private static string EffectiveStatus(Invoice i) => IsOutstanding(i) && i.DueDate < DateTime.UtcNow ? InvoiceStatuses.Overdue : i.Status;
    private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string Hash(Guid id, PayInvoiceRequest request) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { id, request.Amount, request.AutoTaxSetAside, request.Reference }))));

    private static InvoiceSummaryDto MapToDto(Invoice invoice) => new(
        invoice.Id, invoice.InvoiceNumber, invoice.ClientId, invoice.Client?.Name ?? "Client", invoice.Client?.ContactEmail ?? "",
        invoice.ProjectId, invoice.Project?.Name, invoice.IssueDate, invoice.DueDate, invoice.Currency, invoice.Subtotal,
        invoice.TaxRate, invoice.TaxAmount, invoice.TotalAmount, invoice.AmountPaid, EffectiveStatus(invoice), invoice.PaymentTerms,
        invoice.Notes, invoice.DestinationAccountId, invoice.PaymentTransactionId, invoice.PaidAt, invoice.ViewedAt, invoice.CreatedAt,
        invoice.Items.Select(i => new InvoiceItemDto(i.Id, i.Description, i.Quantity, i.UnitPrice, i.Amount)).ToList(),
        invoice.Payments.OrderByDescending(p => p.PaidAt).Select(p => new InvoicePaymentDto(p.Id, p.TransactionId, p.Amount, p.Currency, p.Reference, p.PaidAt)).ToList());
}
