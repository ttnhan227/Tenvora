using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

/// <summary>Builds the optional, internally balanced freelancer sample workspace.</summary>
public static class StarterWorkspaceFactory
{
    public static void Populate(Tenant tenant, User owner, DateTime now)
    {
        tenant.PlanType = "FreelancerPro";
        tenant.BaseCurrency = "USD";
        tenant.Status = "Active";
        tenant.DefaultTaxSetAsideRate = 25m;
        tenant.AutoTaxSetAsideEnabled = true;
        tenant.FilingStatus = "Single";
        tenant.Users.Add(owner);

        var suffix = tenant.Id.ToString("N")[..8].ToUpperInvariant();
        var cedar = Client(tenant.Id, "Cedar & Co", $"billing@cedar-{suffix.ToLowerInvariant()}.example", "USD", 14, 125m, now.AddDays(-80));
        var northline = Client(tenant.Id, "Northline Labs", $"accounts@northline-{suffix.ToLowerInvariant()}.example", "USD", 30, 150m, now.AddDays(-55));
        var fieldwork = Client(tenant.Id, "Fieldwork Press", $"studio@fieldwork-{suffix.ToLowerInvariant()}.example", "GBP", 14, 110m, now.AddDays(-35));
        tenant.Clients.Add(cedar); tenant.Clients.Add(northline); tenant.Clients.Add(fieldwork);

        var cedarProject = Project(tenant.Id, cedar.Id, "Brand identity system", "USD", 6_000m, now.AddDays(-45));
        var northlineProject = Project(tenant.Id, northline.Id, "Product design sprint", "USD", 4_500m, now.AddDays(-25));
        var fieldworkProject = Project(tenant.Id, fieldwork.Id, "Editorial site refresh", "GBP", 2_500m, now.AddDays(-10));
        tenant.Projects.Add(cedarProject); tenant.Projects.Add(northlineProject); tenant.Projects.Add(fieldworkProject);

        var main = Account(tenant.Id, $"MAIN-{suffix}-USD", AccountTypes.Asset, "USD", 9_250m, now.AddDays(-90));
        var tax = Account(tenant.Id, $"TAX-VAULT-{suffix}-USD", AccountTypes.Asset, "USD", 1_200m, now.AddDays(-90));
        var income = Account(tenant.Id, "INCOME-USD", AccountTypes.Equity, "USD", 4_800m, now.AddDays(-90));
        var expenseAccount = Account(tenant.Id, "EXPENSE-SOFTWARE-USD", AccountTypes.Expense, "USD", 350m, now.AddDays(-90));
        var capital = Account(tenant.Id, "OWNER-CAPITAL-USD", AccountTypes.Equity, "USD", 6_000m, now.AddDays(-90));
        var gbp = Account(tenant.Id, $"MAIN-{suffix}-GBP", AccountTypes.Asset, "GBP", 1_850m, now.AddDays(-35));
        var gbpCapital = Account(tenant.Id, "OWNER-CAPITAL-GBP", AccountTypes.Equity, "GBP", 1_850m, now.AddDays(-35));
        foreach (var account in new[] { main, tax, income, expenseAccount, capital, gbp, gbpCapital }) tenant.Accounts.Add(account);

        var opening = Transaction(tenant.Id, "OPENING-USD", "CapitalContribution", 6_000m, "USD", "Opening owner contribution", now.AddDays(-90));
        Entries(opening, tenant.Id, main.Id, capital.Id, 6_000m, "USD", opening.PostedAt!.Value);
        var gbpOpening = Transaction(tenant.Id, "OPENING-GBP", "CapitalContribution", 1_850m, "GBP", "Opening GBP owner contribution", now.AddDays(-35));
        Entries(gbpOpening, tenant.Id, gbp.Id, gbpCapital.Id, 1_850m, "GBP", gbpOpening.PostedAt!.Value);

        var paidInvoice = Invoice(tenant.Id, cedar.Id, cedarProject.Id, "INV-2026-001", "USD", 4_800m, main.Id, InvoiceStatuses.Paid, now.AddDays(-28), now.AddDays(-14), "Brand identity system and production files");
        paidInvoice.AmountPaid = 4_800m;
        paidInvoice.PaidAt = now.AddDays(-12);
        var paymentTx = Transaction(tenant.Id, "PAY-INV-2026-001", TransactionTypes.InvoicePayment, 4_800m, "USD", "Cedar & Co payment for INV-2026-001", now.AddDays(-12));
        paymentTx.Category = "Client income"; paymentTx.RelatedEntityType = "Invoice"; paymentTx.RelatedEntityId = paidInvoice.Id;
        Entries(paymentTx, tenant.Id, main.Id, income.Id, 4_800m, "USD", paymentTx.PostedAt!.Value);
        paidInvoice.PaymentTransactionId = paymentTx.Id;
        tenant.InvoicePayments.Add(new InvoicePayment { Id = Guid.NewGuid(), TenantId = tenant.Id, InvoiceId = paidInvoice.Id, TransactionId = paymentTx.Id, Amount = 4_800m, Currency = "USD", IdempotencyKey = "sample-payment-inv-2026-001", RequestHash = "sample-data", Reference = "ACH-3921", PaidAt = now.AddDays(-12), CreatedAt = now.AddDays(-12) });

        var sentInvoice = Invoice(tenant.Id, northline.Id, northlineProject.Id, "INV-2026-002", "USD", 3_500m, main.Id, InvoiceStatuses.Sent, now.AddDays(-10), now.AddDays(20), "Product design sprint and component library");
        var draftInvoice = Invoice(tenant.Id, fieldwork.Id, fieldworkProject.Id, "INV-2026-003", "GBP", 2_200m, gbp.Id, InvoiceStatuses.Draft, now.AddDays(-2), now.AddDays(12), "Editorial UX and responsive templates");
        tenant.Invoices.Add(paidInvoice); tenant.Invoices.Add(sentInvoice); tenant.Invoices.Add(draftInvoice);

        var taxTx = Transaction(tenant.Id, "TAX-INV-2026-001", "TaxTransfer", 1_200m, "USD", "Tax reserve allocation for INV-2026-001", now.AddDays(-12));
        taxTx.Category = "Tax reserve"; taxTx.RelatedEntityType = "Invoice"; taxTx.RelatedEntityId = paidInvoice.Id;
        Entries(taxTx, tenant.Id, tax.Id, main.Id, 1_200m, "USD", taxTx.PostedAt!.Value);

        var expenseTx = Transaction(tenant.Id, "EXP-FIGMA-001", TransactionTypes.Expense, 350m, "USD", "Design software annual plan", now.AddDays(-5));
        expenseTx.Category = "Software"; expenseTx.RelatedEntityType = "Expense";
        Entries(expenseTx, tenant.Id, expenseAccount.Id, main.Id, 350m, "USD", expenseTx.PostedAt!.Value);
        var expense = new Expense { Id = Guid.NewGuid(), TenantId = tenant.Id, AccountId = main.Id, TransactionId = expenseTx.Id, ClientId = cedar.Id, ProjectId = cedarProject.Id, Merchant = "Figma", Category = "Software", Description = "Design software annual plan", Reference = "CARD-4819", Amount = 350m, Currency = "USD", ExpenseDate = now.AddDays(-5).Date, Status = ExpenseStatuses.Posted, IdempotencyKey = "sample-expense-figma-001", RequestHash = "sample-data", CreatedAt = now.AddDays(-5), UpdatedAt = now.AddDays(-5) };
        expenseTx.RelatedEntityId = expense.Id;
        tenant.Expenses.Add(expense);

        foreach (var transaction in new[] { opening, gbpOpening, paymentTx, taxTx, expenseTx }) tenant.Transactions.Add(transaction);
    }

    private static Client Client(Guid tenantId, string name, string email, string currency, int terms, decimal rate, DateTime created) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, Name = name, ContactEmail = email, Company = name, Currency = currency,
        DefaultPaymentTermsDays = terms, HourlyRate = rate, Status = "Active", CreatedAt = created, UpdatedAt = created
    };

    private static Project Project(Guid tenantId, Guid clientId, string name, string currency, decimal budget, DateTime start) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ClientId = clientId, Name = name, Status = ProjectStatuses.Active,
        Currency = currency, BudgetAmount = budget, StartDate = start.Date, CreatedAt = start, UpdatedAt = start
    };

    private static Account Account(Guid tenantId, string number, string type, string currency, decimal balance, DateTime created) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = number, AccountType = type, Currency = currency,
        CachedBalance = balance, Status = AccountStatuses.Active, CreatedAt = created, UpdatedAt = created
    };

    private static Invoice Invoice(Guid tenantId, Guid clientId, Guid projectId, string number, string currency, decimal total, Guid accountId, string status, DateTime issue, DateTime due, string description)
    {
        var invoice = new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, ClientId = clientId, ProjectId = projectId, InvoiceNumber = number, IssueDate = issue.Date, DueDate = due.Date, Currency = currency, Subtotal = total, TotalAmount = total, Status = status, PaymentTerms = $"Net {(due.Date - issue.Date).Days}", DestinationAccountId = accountId, CreatedAt = issue, UpdatedAt = issue };
        invoice.Items.Add(new InvoiceItem { Id = Guid.NewGuid(), InvoiceId = invoice.Id, Description = description, Quantity = 1m, UnitPrice = total, Amount = total });
        return invoice;
    }

    private static Transaction Transaction(Guid tenantId, string reference, string type, decimal amount, string currency, string description, DateTime posted) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ReferenceNumber = reference, TransactionType = type, Status = TransactionStatuses.Posted,
        Amount = amount, Currency = currency, Description = description, CreatedAt = posted, PostedAt = posted, SettledAt = posted
    };

    private static void Entries(Transaction transaction, Guid tenantId, Guid debitAccountId, Guid creditAccountId, decimal amount, string currency, DateTime posted)
    {
        transaction.LedgerEntries.Add(new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = transaction.Id, AccountId = debitAccountId, EntryType = "Debit", DebitAmount = amount, Currency = currency, PostedAt = posted, Description = transaction.Description });
        transaction.LedgerEntries.Add(new LedgerEntry { Id = Guid.NewGuid(), TenantId = tenantId, TransactionId = transaction.Id, AccountId = creditAccountId, EntryType = "Credit", CreditAmount = amount, Currency = currency, PostedAt = posted, Description = transaction.Description });
    }
}
