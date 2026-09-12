using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public class FreelancerNeobankTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"Tenvora_Freelancer_{Guid.NewGuid()}")
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateClient_And_GetClients_ReturnsProperSummary()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var clientService = new ClientService(context);

        var createReq = new CreateClientRequest(
            "Starlight Design Studio",
            "billing@starlight.io",
            "+1-555-0199",
            "Starlight Studios LLC",
            "100 Tech Blvd, Austin, TX",
            "USD",
            14,
            120m,
            "Design & branding work"
        );

        var createResult = await clientService.CreateClientAsync(tenantId, createReq);
        Assert.True(createResult.Success);
        Assert.NotNull(createResult.Data);
        Assert.Equal("Starlight Design Studio", createResult.Data.Name);
        Assert.Equal("Active", createResult.Data.Status);

        var listResult = await clientService.GetClientsAsync(tenantId);
        Assert.True(listResult.Success);
        Assert.NotNull(listResult.Data);
        Assert.Single(listResult.Data);
        Assert.Equal("Starlight Design Studio", listResult.Data[0].Name);
    }

    [Fact]
    public async Task CreateInvoice_CalculatesSubtotalAndTaxCorrectly()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var clientService = new ClientService(context);
        var invoiceService = new InvoiceService(context);

        var client = (await clientService.CreateClientAsync(tenantId, new CreateClientRequest(
            "Acme Corp", "acme@example.com", null, "Acme", null, "USD", 14, 100m, null))).Data!;

        context.Accounts.Add(new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-USD", AccountType = "Asset", Currency = "USD", Status = "Active" });
        await context.SaveChangesAsync();
        var invoiceReq = new CreateInvoiceRequest(
            client.Id,
            "INV-2026-999",
            DateTime.UtcNow,
            DateTime.UtcNow.AddDays(14),
            "USD",
            0m,
            "Net 14",
            "Thank you for your business!",
            null,
            [
                new InvoiceItemRequest("Brand Identity Design", 10, 150m),
                new InvoiceItemRequest("Design System Documentation", 5, 100m)
            ]
        );

        var invoiceResult = await invoiceService.CreateInvoiceAsync(tenantId, invoiceReq);
        Assert.True(invoiceResult.Success);
        Assert.NotNull(invoiceResult.Data);
        Assert.Equal(2000m, invoiceResult.Data.Subtotal); // (10*150) + (5*100) = 1500 + 500 = 2000
        Assert.Equal(2000m, invoiceResult.Data.TotalAmount);
        Assert.Equal("Draft", invoiceResult.Data.Status);
        Assert.Equal(2, invoiceResult.Data.Items.Count);
    }

    [Fact]
    public async Task PayInvoice_WithAutoTaxSetAside_PerformsDoubleEntrySplitIntoTaxVault()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        // 1. Setup Tenant with 25% Auto Tax Set Aside
        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Alex Rivera Freelance",
            ApiKey = "test-api-key",
            Status = "Active",
            DefaultTaxSetAsideRate = 25m,
            AutoTaxSetAsideEnabled = true,
            FilingStatus = "Single",
            PersonalTaxIdLast4 = "9482",
            LinkedExternalBankName = "Chase Private Client",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Tenants.Add(tenant);

        // 2. Setup Main Spending Wallet & Tax Vault
        var mainWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "MAIN-USD-001",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 1_000m,
            Status = AccountStatuses.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var taxVault = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "TAX-VAULT-USD-001",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 500m,
            Status = AccountStatuses.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Accounts.AddRange(mainWallet, taxVault);

        // 3. Setup Client and Invoice
        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Horizon Media",
            ContactEmail = "finance@horizon.com",
            Currency = "USD",
            Status = "Active"
        };
        context.Clients.Add(client);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = client.Id,
            InvoiceNumber = "INV-2026-100",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14),
            Currency = "USD",
            Subtotal = 4_000m,
            TaxRate = 0m,
            TaxAmount = 0m,
            TotalAmount = 4_000m,
            AmountPaid = 0m,
            Status = "Sent",
            DestinationAccountId = mainWallet.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Invoices.Add(invoice);
        await context.SaveChangesAsync();

        var invoiceService = new InvoiceService(context);

        // 4. Pay the invoice of $4,000 with AutoTaxSetAside = true
        var payResult = await invoiceService.PayInvoiceAsync(tenantId, invoice.Id, new PayInvoiceRequest(4_000m, true));
        Assert.True(payResult.Success);
        Assert.NotNull(payResult.Data);
        Assert.Equal("Paid", payResult.Data.Status);
        Assert.Equal(4_000m, payResult.Data.AmountPaid);

        // 5. Verify Balances:
        // Main wallet had 1,000 + 4,000 credited = 5,000 - 1,000 (25% tax set aside) = 4,000.
        // Tax Vault had 500 + 1,000 (25% tax set aside) = 1,500.
        var updatedMain = await context.Accounts.FindAsync(mainWallet.Id);
        var updatedVault = await context.Accounts.FindAsync(taxVault.Id);

        Assert.NotNull(updatedMain);
        Assert.NotNull(updatedVault);
        Assert.Equal(4_000m, updatedMain.CachedBalance);
        Assert.Equal(1_500m, updatedVault.CachedBalance);

        // 6. Verify Ledger Entries
        var ledgerEntries = await context.LedgerEntries.Where(l => l.TenantId == tenantId).ToListAsync();
        Assert.NotEmpty(ledgerEntries);

        // There should be 1 credit for invoice payment ($4000) and 1 debit ($1000) + 1 credit ($1000) for tax split
        var totalDebits = ledgerEntries.Sum(l => l.DebitAmount);
        var totalCredits = ledgerEntries.Sum(l => l.CreditAmount);
        Assert.Equal(5_000m, totalDebits);
        Assert.Equal(totalDebits, totalCredits); // 4000 primary payment credit + 1000 tax vault credit
    }

    [Fact]
    public async Task TaxService_ReturnsAccurateSummaryAndQuarterlyDeadlines()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Sarah Chen UX",
            ApiKey = "test-api-key-2",
            Status = "Active",
            DefaultTaxSetAsideRate = 25m,
            AutoTaxSetAsideEnabled = true,
            FilingStatus = "Single",
            PersonalTaxIdLast4 = "3391",
            LinkedExternalBankName = "Silicon Valley Bank",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Tenants.Add(tenant);

        var mainWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "MAIN-USD-002",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 8_000m,
            Status = AccountStatuses.Active
        };

        var taxVault = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "TAX-VAULT-USD-002",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 2_500m,
            Status = AccountStatuses.Active
        };

        context.Accounts.AddRange(mainWallet, taxVault);
        await context.SaveChangesAsync();

        var taxService = new TaxService(context);
        var summary = await taxService.GetTaxSummaryAsync(tenantId);

        Assert.True(summary.Success);
        Assert.NotNull(summary.Data);
        Assert.Equal(8_000m, summary.Data.AvailableSpendingBalance);
        Assert.Equal(2_500m, summary.Data.TaxVaultBalance);
        Assert.Equal(25m, summary.Data.DefaultTaxRatePercent);
        Assert.Equal(4, summary.Data.QuarterlySchedule.Count);
    }

    [Fact]
    public async Task ClientBasedReconciliation_AutoMatchesIncomingPaymentToOpenInvoice()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Vanguard Digital",
            ContactEmail = "invoices@vanguarddigital.com",
            Currency = "USD",
            Status = "Active"
        };
        context.Clients.Add(client);

        var wallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "MAIN-RECON-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 0m,
            Status = AccountStatuses.Active
        };
        context.Accounts.Add(wallet);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = client.Id,
            InvoiceNumber = "INV-2026-777",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14),
            Currency = "USD",
            Subtotal = 1_500m,
            TotalAmount = 1_500m,
            AmountPaid = 0m,
            Status = "Sent",
            DestinationAccountId = wallet.Id
        };
        context.Invoices.Add(invoice);

        // Incoming bank deposit with description matching INV-2026-777
        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ReferenceNumber = "DEP-9921",
            TransactionType = TransactionTypes.Transfer,
            Status = TransactionStatuses.Posted,
            Amount = 1_500m,
            Currency = "USD",
            Description = "Client wire payment for INV-2026-777 Vanguard Digital",
            CreatedAt = DateTime.UtcNow,
            PostedAt = DateTime.UtcNow
        };
        context.Transactions.Add(tx);
        await context.SaveChangesAsync();

        var reconRepo = new Tenvora.Api.Repositories.ReconciliationRepository(context);
        var ledgerRepo = new Tenvora.Api.Repositories.LedgerRepository(context);
        var reconService = new ReconciliationService(context, reconRepo, ledgerRepo);

        var result = await reconService.ReconcileClientInvoicesAsync(tenantId);

        Assert.Equal(1, result.InvoicesChecked);
        Assert.Equal(1, result.MatchedCount);
        Assert.Equal(1_500m, result.TotalMatchedAmount);
        Assert.Equal(0, result.UnmatchedInvoiceCount);

        var updatedInvoice = await context.Invoices.FindAsync(invoice.Id);
        Assert.NotNull(updatedInvoice);
        Assert.Equal("Paid", updatedInvoice.Status);
        Assert.Equal(tx.Id, updatedInvoice.PaymentTransactionId);
        Assert.Equal(1_500m, updatedInvoice.AmountPaid);
    }

    [Fact]
    public async Task TaxSummary_DoesNotAddDifferentCurrenciesTogether()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        context.Tenants.Add(new Tenant
        {
            Id = tenantId,
            CompanyName = "Multi Currency Studio",
            ApiKey = "multi-currency-test",
            BaseCurrency = "USD",
            Status = "Active"
        });
        context.Accounts.AddRange(
            new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-USD", AccountType = AccountTypes.Asset, Currency = "USD", CachedBalance = 100m, Status = AccountStatuses.Active },
            new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-EUR", AccountType = AccountTypes.Asset, Currency = "EUR", CachedBalance = 900m, Status = AccountStatuses.Active },
            new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "TAX-VAULT-USD", AccountType = AccountTypes.Asset, Currency = "USD", CachedBalance = 25m, Status = AccountStatuses.Active },
            new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "TAX-VAULT-EUR", AccountType = AccountTypes.Asset, Currency = "EUR", CachedBalance = 200m, Status = AccountStatuses.Active }
        );
        context.Invoices.AddRange(
            new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, ClientId = Guid.NewGuid(), InvoiceNumber = "USD-1", Currency = "USD", TotalAmount = 1_000m, AmountPaid = 1_000m, PaidAt = DateTime.UtcNow, Status = "Paid" },
            new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, ClientId = Guid.NewGuid(), InvoiceNumber = "EUR-1", Currency = "EUR", TotalAmount = 9_000m, AmountPaid = 9_000m, PaidAt = DateTime.UtcNow, Status = "Paid" }
        );
        await context.SaveChangesAsync();

        var summary = await new TaxService(context).GetTaxSummaryAsync(tenantId);

        Assert.True(summary.Success);
        Assert.Equal("USD", summary.Data!.Currency);
        Assert.Equal(100m, summary.Data.AvailableSpendingBalance);
        Assert.Equal(25m, summary.Data.TaxVaultBalance);
        Assert.Equal(1_000m, summary.Data.YtdGrossIncome);

        var invoiceStats = await new InvoiceService(context).GetInvoiceStatsAsync(tenantId);
        Assert.Equal("USD", invoiceStats.Data!.Currency);
        Assert.Equal(1_000m, invoiceStats.Data.TotalInvoicedAmount);
        Assert.Equal(1, invoiceStats.Data.TotalInvoicesCount);
    }

    [Fact]
    public async Task CreateInvoice_SelectsAnOperatingAccountInTheInvoiceCurrency()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var client = new Client
        {
            Id = Guid.NewGuid(), TenantId = tenantId, Name = "London Client",
            ContactEmail = "billing@london.example", Currency = "GBP", Status = "Active"
        };
        var usdAccount = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-USD", AccountType = AccountTypes.Asset, Currency = "USD", Status = AccountStatuses.Active };
        var gbpAccount = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-GBP", AccountType = AccountTypes.Asset, Currency = "GBP", Status = AccountStatuses.Active };
        context.Clients.Add(client);
        context.Accounts.AddRange(usdAccount, gbpAccount);
        await context.SaveChangesAsync();

        var result = await new InvoiceService(context).CreateInvoiceAsync(tenantId, new CreateInvoiceRequest(
            client.Id, null, null, null, "GBP", 0m, "Net 14", null, null,
            [new InvoiceItemRequest("Consulting", 1m, 500m)]));

        Assert.True(result.Success);
        Assert.Equal("GBP", result.Data!.Currency);
        Assert.Equal(gbpAccount.Id, result.Data.DestinationAccountId);
    }

    [Fact]
    public async Task AiController_Handles_Queries_Accurately_Without_Keyword_Collisions()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            CompanyName = "Rivera Creative Labs",
            ApiKey = "test-tenant-key-12345",
            DefaultTaxSetAsideRate = 25m,
            AutoTaxSetAsideEnabled = true,
            BaseCurrency = "USD",
            PlanType = "FreelancerPro",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Tenants.Add(tenant);

        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "SlowCorp Inc",
            ContactEmail = "billing@slowcorp.com",
            Company = "SlowCorp",
            DefaultPaymentTermsDays = 45,
            Currency = "USD",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Clients.Add(client);

        var overdueInv = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = client.Id,
            InvoiceNumber = "INV-OVERDUE-01",
            Status = "Sent",
            Subtotal = 1200m,
            TotalAmount = 1200m,
            AmountPaid = 0m,
            DueDate = DateTime.UtcNow.AddDays(-10),
            CreatedAt = DateTime.UtcNow.AddDays(-40),
            UpdatedAt = DateTime.UtcNow.AddDays(-40)
        };
        context.Invoices.Add(overdueInv);

        var mainWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "MAIN-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 5000m,
            Status = AccountStatuses.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var taxVault = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountNumber = "TAX-VAULT-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 1500m,
            Status = AccountStatuses.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Accounts.AddRange(mainWallet, taxVault);
        await context.SaveChangesAsync();

        var controller = new Tenvora.Api.Controllers.AiController(context);
        var claims = new[] { new System.Security.Claims.Claim("tenantId", tenantId.ToString()) };
        controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "TestAuth"))
            }
        };

        // 1. Verify "Which client pays slowest and has overdue invoices?" does NOT trigger tax logic
        var slowestReq = new Tenvora.Api.Controllers.AiQueryRequest("Which client pays slowest and has overdue invoices?");
        var slowestRes = await controller.Query(slowestReq) as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(slowestRes);
        var slowestApiResult = slowestRes.Value as ApiResult<object>;
        Assert.NotNull(slowestApiResult);
        var slowestText = slowestApiResult.Data?.GetType().GetProperty("response")?.GetValue(slowestApiResult.Data)?.ToString();
        Assert.NotNull(slowestText);
        Assert.Contains("SlowCorp Inc", slowestText);
        Assert.Contains("45", slowestText);
        Assert.Contains("INV-OVERDUE-01", slowestText);
        Assert.DoesNotContain("withholding rate", slowestText);

        // 2. Verify "who are you" returns the friendly identity greeting
        var whoReq = new Tenvora.Api.Controllers.AiQueryRequest("who are you");
        var whoRes = await controller.Query(whoReq) as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(whoRes);
        var whoApiResult = whoRes.Value as ApiResult<object>;
        Assert.NotNull(whoApiResult);
        var whoText = whoApiResult.Data?.GetType().GetProperty("response")?.GetValue(whoApiResult.Data)?.ToString();
        Assert.NotNull(whoText);
        Assert.Contains("Tenvora cash-flow assistant", whoText);

        // 3. Verify expense affordability checks available spend
        var affordReq = new Tenvora.Api.Controllers.AiQueryRequest("Can I afford to purchase a $1,200 new MacBook for work right now?");
        var affordRes = await controller.Query(affordReq) as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(affordRes);
        var affordApiResult = affordRes.Value as ApiResult<object>;
        Assert.NotNull(affordApiResult);
        var affordText = affordApiResult.Data?.GetType().GetProperty("response")?.GetValue(affordApiResult.Data)?.ToString();
        Assert.NotNull(affordText);
        Assert.Contains("covers", affordText);
        Assert.Contains("1,200.00 USD", affordText);

        // 4. Verify in-page summaries use the current tenant's database records and expose their context source
        var summaryReq = new Tenvora.Api.Controllers.AiQueryRequest("Give me a concise overview of my most important financial priority today and explain why using my current workspace records.");
        var summaryRes = await controller.Query(summaryReq) as Microsoft.AspNetCore.Mvc.OkObjectResult;
        Assert.NotNull(summaryRes);
        var summaryApiResult = summaryRes.Value as ApiResult<object>;
        Assert.NotNull(summaryApiResult);
        var summaryText = summaryApiResult.Data?.GetType().GetProperty("response")?.GetValue(summaryApiResult.Data)?.ToString();
        var summaryContext = summaryApiResult.Data?.GetType().GetProperty("context")?.GetValue(summaryApiResult.Data)?.ToString();
        Assert.NotNull(summaryText);
        Assert.Contains("5,000.00 USD", summaryText);
        Assert.Contains("1,200.00 USD", summaryText);
        Assert.Contains("Why this matters", summaryText);
        Assert.Equal("tenant-database", summaryContext);
    }
}

