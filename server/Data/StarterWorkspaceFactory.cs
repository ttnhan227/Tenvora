using System.Text.Json;
using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

public static class StarterWorkspaceFactory
{
    public static void Populate(Tenant tenant, User owner, DateTime now)
    {
        tenant.PlanType = "FreelancerPro";
        tenant.BaseCurrency = "USD";
        tenant.Status = "Active";
        tenant.DefaultTaxSetAsideRate = 25.0m;
        tenant.AutoTaxSetAsideEnabled = true;
        tenant.FilingStatus = "Single";
        tenant.PersonalTaxIdLast4 = "4819";
        tenant.LinkedExternalBankName = "Chase Checking (****8812)";

        tenant.Users.Add(owner);

        var suffix = tenant.Id.ToString("N")[..8];

        // Seed Freelancer Clients (CRM)
        var client1 = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Acme Design Studios",
            ContactEmail = $"finance@acmedesign-{suffix}.com",
            Phone = "+1 (555) 234-5678",
            Company = "Acme Studios Inc.",
            Address = "100 Market St, San Francisco, CA 94105",
            Currency = "USD",
            DefaultPaymentTermsDays = 14,
            HourlyRate = 120.00m,
            Status = "Active",
            Notes = "Long-term client. Prefers bi-weekly invoicing for design sprints.",
            CreatedAt = now.AddDays(-60),
            UpdatedAt = now.AddDays(-60)
        };

        var client2 = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Starlight Cloud Media",
            ContactEmail = $"billing@starlightcloud-{suffix}.io",
            Phone = "+1 (555) 876-5432",
            Company = "Starlight Cloud Ltd",
            Address = "450 Lexington Ave, New York, NY 10017",
            Currency = "USD",
            DefaultPaymentTermsDays = 30,
            HourlyRate = 150.00m,
            Status = "Active",
            Notes = "Enterprise SaaS client. Net 30 payment terms.",
            CreatedAt = now.AddDays(-45),
            UpdatedAt = now.AddDays(-45)
        };

        var client3 = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Horizon Digital UK",
            ContactEmail = $"ap@horizondigital-{suffix}.co.uk",
            Phone = "+44 20 7946 0912",
            Company = "Horizon Interactive UK",
            Address = "25 Finsbury Square, London, EC2A 1DX",
            Currency = "GBP",
            DefaultPaymentTermsDays = 14,
            HourlyRate = 110.00m,
            Status = "Active",
            Notes = "International client billing in GBP (£).",
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now.AddDays(-30)
        };

        tenant.Clients.Add(client1);
        tenant.Clients.Add(client2);
        tenant.Clients.Add(client3);

        // Seed Freelancer Accounts (Main Spending Wallet, Tax Savings Vault, Multi-Currency Wallets)
        var mainSpendingWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            AccountNumber = $"MAIN-{suffix}-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 7_450.00m,
            Status = AccountStatuses.Active,
            CreatedAt = now.AddDays(-60),
            UpdatedAt = now
        };

        var taxSavingsVault = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            AccountNumber = $"TAX-VAULT-{suffix}",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 2_850.00m,
            Status = AccountStatuses.Active,
            CreatedAt = now.AddDays(-60),
            UpdatedAt = now
        };

        var gbpWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            AccountNumber = $"WALLET-GBP-{suffix}",
            AccountType = AccountTypes.Asset,
            Currency = "GBP",
            CachedBalance = 1_850.00m,
            Status = AccountStatuses.Active,
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now
        };

        tenant.Accounts.Add(mainSpendingWallet);
        tenant.Accounts.Add(taxSavingsVault);
        tenant.Accounts.Add(gbpWallet);

        // Seed Sample Invoices
        var invoice1 = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            ClientId = client1.Id,
            InvoiceNumber = "INV-2026-001",
            IssueDate = now.AddDays(-20),
            DueDate = now.AddDays(-6),
            Currency = "USD",
            Subtotal = 4_800.00m,
            TaxRate = 0m,
            TaxAmount = 0m,
            TotalAmount = 4_800.00m,
            AmountPaid = 4_800.00m,
            Status = "Paid",
            PaymentTerms = "Net 14",
            Notes = "Brand Identity System & Design Sprint 1",
            DestinationAccountId = mainSpendingWallet.Id,
            PaidAt = now.AddDays(-7),
            CreatedAt = now.AddDays(-20),
            UpdatedAt = now.AddDays(-7)
        };
        invoice1.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice1.Id,
            Description = "Brand Identity System & Style Guide",
            Quantity = 40m,
            UnitPrice = 120.00m,
            Amount = 4_800.00m
        });

        var invoice2 = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            ClientId = client2.Id,
            InvoiceNumber = "INV-2026-002",
            IssueDate = now.AddDays(-10),
            DueDate = now.AddDays(20),
            Currency = "USD",
            Subtotal = 3_500.00m,
            TaxRate = 0m,
            TaxAmount = 0m,
            TotalAmount = 3_500.00m,
            AmountPaid = 0m,
            Status = "Sent",
            PaymentTerms = "Net 30",
            Notes = "Design System Component Tokens & Figma Library",
            DestinationAccountId = mainSpendingWallet.Id,
            CreatedAt = now.AddDays(-10),
            UpdatedAt = now.AddDays(-10)
        };
        invoice2.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice2.Id,
            Description = "UI Component Tokens Architecture",
            Quantity = 20m,
            UnitPrice = 150.00m,
            Amount = 3_000.00m
        });
        invoice2.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice2.Id,
            Description = "Figma Library Auto-Layout Setup",
            Quantity = 1m,
            UnitPrice = 500.00m,
            Amount = 500.00m
        });

        var invoice3 = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            ClientId = client3.Id,
            InvoiceNumber = "INV-2026-003",
            IssueDate = now.AddDays(-2),
            DueDate = now.AddDays(12),
            Currency = "GBP",
            Subtotal = 2_200.00m,
            TaxRate = 0m,
            TaxAmount = 0m,
            TotalAmount = 2_200.00m,
            AmountPaid = 0m,
            Status = "Draft",
            PaymentTerms = "Net 14",
            Notes = "Q3 Product UX Strategy & Wireframing",
            DestinationAccountId = gbpWallet.Id,
            CreatedAt = now.AddDays(-2),
            UpdatedAt = now.AddDays(-2)
        };
        invoice3.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice3.Id,
            Description = "UX Strategy Workshop & Wireframes",
            Quantity = 20m,
            UnitPrice = 110.00m,
            Amount = 2_200.00m
        });

        tenant.Invoices.Add(invoice1);
        tenant.Invoices.Add(invoice2);
        tenant.Invoices.Add(invoice3);

        // Seed Payment Transaction for INV-2026-001
        var payTxId = Guid.NewGuid();
        var payTx = new Transaction
        {
            Id = payTxId,
            TenantId = tenant.Id,
            ReferenceNumber = "PAY-INV-2026-001",
            TransactionType = TransactionTypes.Transfer,
            Status = TransactionStatuses.Posted,
            Amount = 4_800.00m,
            Currency = "USD",
            Description = "Client payment for INV-2026-001 from Acme Design Studios",
            CreatedAt = now.AddDays(-7),
            PostedAt = now.AddDays(-7),
            SettledAt = now.AddDays(-7)
        };
        invoice1.PaymentTransactionId = payTxId;

        payTx.LedgerEntries.Add(new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            TransactionId = payTxId,
            AccountId = mainSpendingWallet.Id,
            EntryType = "CREDIT",
            DebitAmount = 0m,
            CreditAmount = 4_800.00m,
            Currency = "USD",
            PostedAt = now.AddDays(-7),
            Description = "Client payment received"
        });
        tenant.Transactions.Add(payTx);

        // Seed 25% Auto Tax Set-Aside ($1,200) for INV-2026-001
        var taxTxId = Guid.NewGuid();
        var taxTx = new Transaction
        {
            Id = taxTxId,
            TenantId = tenant.Id,
            ReferenceNumber = "TAX-SPLIT-INV-2026-001",
            TransactionType = TransactionTypes.Transfer,
            Status = TransactionStatuses.Posted,
            Amount = 1_200.00m,
            Currency = "USD",
            Description = "Auto 25% tax set-aside for INV-2026-001",
            CreatedAt = now.AddDays(-7),
            PostedAt = now.AddDays(-7),
            SettledAt = now.AddDays(-7)
        };

        taxTx.LedgerEntries.Add(new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            TransactionId = taxTxId,
            AccountId = mainSpendingWallet.Id,
            EntryType = "DEBIT",
            DebitAmount = 1_200.00m,
            CreditAmount = 0m,
            Currency = "USD",
            PostedAt = now.AddDays(-7),
            Description = "Tax set-aside from INV-2026-001"
        });

        taxTx.LedgerEntries.Add(new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            TransactionId = taxTxId,
            AccountId = taxSavingsVault.Id,
            EntryType = "CREDIT",
            DebitAmount = 0m,
            CreditAmount = 1_200.00m,
            Currency = "USD",
            PostedAt = now.AddDays(-7),
            Description = "Tax-reserve planning allocation"
        });

        tenant.Transactions.Add(taxTx);
    }
}
