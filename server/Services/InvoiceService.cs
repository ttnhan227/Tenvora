using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public class InvoiceService : IInvoiceService
{
    private readonly AppDbContext _dbContext;

    public InvoiceService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ApiResult<List<InvoiceSummaryDto>>> GetInvoicesAsync(Guid tenantId, string? status = null, Guid? clientId = null)
    {
        var query = _dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status == status);
        }

        if (clientId.HasValue && clientId.Value != Guid.Empty)
        {
            query = query.Where(i => i.ClientId == clientId.Value);
        }

        var invoices = await query
            .Include(i => i.Client)
            .Include(i => i.Items)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var dtos = invoices.Select(MapToDto).ToList();
        return ApiResult<List<InvoiceSummaryDto>>.Ok(dtos);
    }

    public async Task<ApiResult<InvoiceSummaryDto>> GetInvoiceByIdAsync(Guid tenantId, Guid invoiceId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_dbContext, tenantId);
        var invoice = await _dbContext.Invoices
            .AsNoTracking()
            .Include(i => i.Client)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId);

        if (invoice == null)
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice not found");
        }

        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<InvoiceStatsDto>> GetInvoiceStatsAsync(Guid tenantId)
    {
        var invoices = await _dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId)
            .ToListAsync();

        var reportingCurrency = await _dbContext.Tenants
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => t.BaseCurrency)
            .FirstOrDefaultAsync() ?? "USD";
        var reportingInvoices = invoices.Where(i => i.Currency == reportingCurrency).ToList();

        var totalInvoiced = reportingInvoices.Sum(i => i.TotalAmount);
        var totalPaid = reportingInvoices.Sum(i => i.AmountPaid);
        var totalOutstanding = totalInvoiced - totalPaid;
        var totalCount = reportingInvoices.Count;
        var openCount = reportingInvoices.Count(i => i.Status == "Sent" || i.Status == "Viewed");
        var paidCount = reportingInvoices.Count(i => i.Status == "Paid");
        var overdueCount = reportingInvoices.Count(i => i.Status == "Overdue" || (i.DueDate < DateTime.UtcNow && i.Status != "Paid" && i.Status != "Draft"));

        var stats = new InvoiceStatsDto(
            reportingCurrency,
            totalInvoiced,
            totalPaid,
            totalOutstanding,
            totalCount,
            openCount,
            paidCount,
            overdueCount
        );

        return ApiResult<InvoiceStatsDto>.Ok(stats);
    }

    public async Task<ApiResult<InvoiceSummaryDto>> CreateInvoiceAsync(Guid tenantId, CreateInvoiceRequest request)
    {
        var client = await _dbContext.Clients
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.ClientId);

        if (client == null)
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invalid client selected");
        }

        if (request.Items == null || !request.Items.Any())
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice must contain at least one line item");
        }

        if (request.Items.Any(i => i.Quantity <= 0 || i.UnitPrice < 0 || string.IsNullOrWhiteSpace(i.Description)) || request.TaxRate is < 0 or > 100)
            return ApiResult<InvoiceSummaryDto>.Fail("Use positive quantities, non-negative prices and a tax rate from 0 to 100.");
        await using var write = await FinancialWriteScope.BeginAsync(_dbContext, tenantId);
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? client.Currency : request.Currency.Trim().ToUpperInvariant();

        // Determine destination account (freelancer main wallet)
        var destinationAccountId = request.DestinationAccountId;
        if (!destinationAccountId.HasValue || destinationAccountId.Value == Guid.Empty)
        {
            var defaultWallet = await _dbContext.Accounts
                .FirstOrDefaultAsync(a =>
                    a.TenantId == tenantId &&
                    a.AccountType == AccountTypes.Asset &&
                    a.Status == AccountStatuses.Active &&
                    a.Currency == currency &&
                    !a.AccountNumber.StartsWith("TAX-VAULT-"));

            if (defaultWallet != null)
            {
                destinationAccountId = defaultWallet.Id;
            }
            else
            {
                return ApiResult<InvoiceSummaryDto>.Fail("Create an active operating account before invoicing.");
            }
        }

        var issueDate = request.IssueDate ?? DateTime.UtcNow;
        var paymentTermsDays = client.DefaultPaymentTermsDays > 0 ? client.DefaultPaymentTermsDays : 14;
        var dueDate = request.DueDate ?? issueDate.AddDays(paymentTermsDays);

        // Generate invoice number if not provided
        var invoiceNumber = request.InvoiceNumber;
        if (string.IsNullOrWhiteSpace(invoiceNumber))
        {
            var count = await _dbContext.Invoices.CountAsync(i => i.TenantId == tenantId);
            invoiceNumber = $"INV-{DateTime.UtcNow.Year}-{(count + 1):D3}";
        }

        var destination = await _dbContext.Accounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == destinationAccountId && a.AccountType == AccountTypes.Asset && a.Status == AccountStatuses.Active && a.Currency == currency);
        if (destination == null) return ApiResult<InvoiceSummaryDto>.Fail("Choose an active account in this workspace with the invoice currency.");
        if (dueDate < issueDate) return ApiResult<InvoiceSummaryDto>.Fail("Due date must not precede issue date.");
        if (await _dbContext.Invoices.AnyAsync(i => i.TenantId == tenantId && i.InvoiceNumber == invoiceNumber))
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice number already exists.");
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = client.Id,
            InvoiceNumber = invoiceNumber,
            IssueDate = issueDate,
            DueDate = dueDate,
            Currency = currency,
            PaymentTerms = string.IsNullOrWhiteSpace(request.PaymentTerms) ? $"Net {paymentTermsDays}" : request.PaymentTerms.Trim(),
            Notes = request.Notes?.Trim(),
            DestinationAccountId = destinationAccountId.Value,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        decimal subtotal = 0m;
        foreach (var item in request.Items)
        {
            var qty = item.Quantity <= 0 ? 1m : item.Quantity;
            var lineAmount = qty * item.UnitPrice;
            subtotal += lineAmount;

            invoice.Items.Add(new InvoiceItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                Description = string.IsNullOrWhiteSpace(item.Description) ? "Professional Services" : item.Description.Trim(),
                Quantity = qty,
                UnitPrice = item.UnitPrice,
                Amount = lineAmount
            });
        }

        var taxRate = request.TaxRate ?? 0m;
        var taxAmount = subtotal * (taxRate / 100m);
        invoice.Subtotal = subtotal;
        invoice.TaxRate = taxRate;
        invoice.TaxAmount = taxAmount;
        invoice.TotalAmount = subtotal + taxAmount;
        invoice.AmountPaid = 0m;

        _dbContext.Invoices.Add(invoice);
        await _dbContext.SaveChangesAsync();

        if (write != null) await write.CommitAsync();
        invoice.Client = client;
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<InvoiceSummaryDto>> SendInvoiceAsync(Guid tenantId, Guid invoiceId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_dbContext, tenantId);
        var invoice = await _dbContext.Invoices
            .Include(i => i.Client)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId);

        if (invoice == null)
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice not found");
        }

        if (invoice.Status == "Paid")
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice is already paid");
        }

        invoice.Status = "Sent";
        invoice.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        if (write != null) await write.CommitAsync();
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<InvoiceSummaryDto>> PayInvoiceAsync(Guid tenantId, Guid invoiceId, PayInvoiceRequest request)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_dbContext, tenantId);
        var invoice = await _dbContext.Invoices
            .Include(i => i.Client)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId);

        if (invoice == null)
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice not found");
        }

        if (invoice.Status == "Paid")
        {
            return ApiResult<InvoiceSummaryDto>.Fail("Invoice has already been marked as paid");
        }

        var tenant = await _dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        var amountToPay = request.Amount ?? (invoice.TotalAmount - invoice.AmountPaid);
        if (amountToPay <= 0 || amountToPay > invoice.TotalAmount - invoice.AmountPaid || decimal.Round(amountToPay, 4) != amountToPay)
            return ApiResult<InvoiceSummaryDto>.Fail("Payment must be positive and cannot exceed the outstanding amount.");

        // 1. Locate the freelancer's Main Spending Wallet and Tax Savings Vault
        var accounts = await _dbContext.Accounts
            .Where(a => a.TenantId == tenantId && a.Status == AccountStatuses.Active)
            .ToListAsync();

        var mainWallet = accounts.FirstOrDefault(a => a.AccountNumber.StartsWith("MAIN-") || a.AccountNumber.StartsWith("OP-"))
                         ?? accounts.FirstOrDefault(a => a.AccountType == AccountTypes.Asset)
                         ?? accounts.FirstOrDefault();

        var taxVault = accounts.FirstOrDefault(a =>
            a.AccountNumber.StartsWith("TAX-VAULT-") && a.Currency == invoice.Currency);

        // If no tax vault exists, create one automatically
        if (taxVault == null && tenant != null)
        {
            var suffix = tenantId.ToString("N")[..8];
            taxVault = new Account
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                AccountNumber = $"TAX-VAULT-{suffix}-{invoice.Currency}",
                AccountType = AccountTypes.Asset,
                Currency = invoice.Currency,
                CachedBalance = 0m,
                Status = AccountStatuses.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _dbContext.Accounts.Add(taxVault);
            accounts.Add(taxVault);
        }

        var targetWallet = accounts.FirstOrDefault(a => a.Id == invoice.DestinationAccountId && a.AccountType == AccountTypes.Asset && a.Currency == invoice.Currency);
        if (targetWallet == null) return ApiResult<InvoiceSummaryDto>.Fail("Invoice destination account must be active and use the invoice currency.");
        if (taxVault != null && taxVault.Currency != invoice.Currency)
            return ApiResult<InvoiceSummaryDto>.Fail("Tax-reserve category currency does not match invoice currency.");
        var income = accounts.FirstOrDefault(a => a.AccountNumber == "INCOME-" + invoice.Currency);
        if (income == null)
        {
            income = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "INCOME-" + invoice.Currency, AccountType = "Equity", Currency = invoice.Currency, Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            _dbContext.Accounts.Add(income);
        }
        if (income.AccountType != "Equity") return ApiResult<InvoiceSummaryDto>.Fail("Income account must be an equity account.");
        income.CachedBalance += amountToPay;
        income.UpdatedAt = DateTime.UtcNow;

        // 2. Create the Primary Payment Transaction
        var paymentTxId = Guid.NewGuid();
        var paymentRef = $"PAY-{Guid.NewGuid():N}";

        var paymentTx = new Transaction
        {
            Id = paymentTxId,
            TenantId = tenantId,
            ReferenceNumber = paymentRef,
            TransactionType = "InvoicePayment",
            Status = TransactionStatuses.Posted,
            Amount = amountToPay,
            Currency = invoice.Currency,
            Description = $"Client payment for {invoice.InvoiceNumber} from {invoice.Client?.Name ?? "Client"}",
            CreatedAt = DateTime.UtcNow,
            PostedAt = DateTime.UtcNow,
            SettledAt = DateTime.UtcNow
        };

        _dbContext.Transactions.Add(paymentTx);
        _dbContext.LedgerEntries.Add(new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = paymentTxId, AccountId = income.Id, EntryType = "Credit", CreditAmount = amountToPay, Currency = invoice.Currency, PostedAt = DateTime.UtcNow, Description = "Invoice income" });

        // Credit freelancer's wallet
        if (targetWallet != null)
        {
            targetWallet.CachedBalance += amountToPay;
            targetWallet.UpdatedAt = DateTime.UtcNow;

            var ledgerEntry = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = paymentTxId,
                AccountId = targetWallet.Id,
                EntryType = "Debit",
                DebitAmount = amountToPay,
                CreditAmount = 0m,
                Currency = invoice.Currency,
                PostedAt = DateTime.UtcNow,
                Description = $"Payment received for {invoice.InvoiceNumber}"
            };
            _dbContext.LedgerEntries.Add(ledgerEntry);
        }

        // 3. Automatic Tax Set-Aside Split (e.g. 25% to Tax Vault)
        var autoTax = request.AutoTaxSetAside && (tenant == null || tenant.AutoTaxSetAsideEnabled);
        if (autoTax && targetWallet != null && taxVault != null && targetWallet.Id != taxVault.Id)
        {
            var taxRatePercent = tenant?.DefaultTaxSetAsideRate ?? 25.0m;
            var taxAmount = Math.Round(amountToPay * (taxRatePercent / 100m), 2);

            if (taxAmount > 0 && targetWallet.CachedBalance >= taxAmount)
            {
                targetWallet.CachedBalance -= taxAmount;
                taxVault.CachedBalance += taxAmount;
                taxVault.UpdatedAt = DateTime.UtcNow;

                var taxTxId = Guid.NewGuid();
                var taxTxRef = $"TAX-SPLIT-{Guid.NewGuid():N}";

                var taxTx = new Transaction
                {
                    Id = taxTxId,
                    TenantId = tenantId,
                    ReferenceNumber = taxTxRef,
                    TransactionType = "TaxTransfer",
                    Status = TransactionStatuses.Posted,
                    Amount = taxAmount,
                    Currency = invoice.Currency,
                    Description = $"Auto {taxRatePercent:0.#}% tax-reserve allocation for {invoice.InvoiceNumber}",
                    CreatedAt = DateTime.UtcNow,
                    PostedAt = DateTime.UtcNow,
                    SettledAt = DateTime.UtcNow
                };
                _dbContext.Transactions.Add(taxTx);

                // Debit Main Wallet
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    TransactionId = taxTxId,
                    AccountId = targetWallet.Id,
                    EntryType = "Credit",
                    DebitAmount = 0m,
                    CreditAmount = taxAmount,
                    Currency = invoice.Currency,
                    PostedAt = DateTime.UtcNow,
                    Description = $"Tax set-aside deduction for {invoice.InvoiceNumber}"
                });

                // Credit Tax Vault
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    TransactionId = taxTxId,
                    AccountId = taxVault.Id,
                    EntryType = "Debit",
                    DebitAmount = taxAmount,
                    CreditAmount = 0m,
                    Currency = invoice.Currency,
                    PostedAt = DateTime.UtcNow,
                    Description = $"Tax-reserve allocation from {invoice.InvoiceNumber}"
                });
            }
        }

        // 4. Update Invoice Record
        invoice.AmountPaid += amountToPay;
        invoice.Status = invoice.AmountPaid == invoice.TotalAmount ? "Paid" : "Sent";
        invoice.PaidAt = DateTime.UtcNow;
        invoice.PaymentTransactionId = paymentTxId;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        if (write != null) await write.CommitAsync();
        return ApiResult<InvoiceSummaryDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResult<bool>> DeleteInvoiceAsync(Guid tenantId, Guid invoiceId)
    {
        await using var write = await FinancialWriteScope.BeginAsync(_dbContext, tenantId);
        var invoice = await _dbContext.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId);

        if (invoice == null)
        {
            return ApiResult<bool>.Fail("Invoice not found");
        }

        if (invoice.AmountPaid > 0)
        {
            return ApiResult<bool>.Fail("Cannot delete a paid invoice. You can cancel or issue a credit note instead.");
        }

        _dbContext.Invoices.Remove(invoice);
        await _dbContext.SaveChangesAsync();
        if (write != null) await write.CommitAsync();
        return ApiResult<bool>.Ok(true);
    }

    private static InvoiceSummaryDto MapToDto(Invoice invoice)
    {
        var items = invoice.Items.Select(item => new InvoiceItemDto(
            item.Id,
            item.Description,
            item.Quantity,
            item.UnitPrice,
            item.Amount
        )).ToList();

        return new InvoiceSummaryDto(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.ClientId,
            invoice.Client?.Name ?? "Client",
            invoice.Client?.ContactEmail ?? "",
            invoice.IssueDate,
            invoice.DueDate,
            invoice.Currency,
            invoice.Subtotal,
            invoice.TaxRate,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.AmountPaid,
            invoice.Status,
            invoice.PaymentTerms,
            invoice.Notes,
            invoice.DestinationAccountId,
            invoice.PaymentTransactionId,
            invoice.PaidAt,
            invoice.ViewedAt,
            invoice.CreatedAt,
            items
        );
    }
}
