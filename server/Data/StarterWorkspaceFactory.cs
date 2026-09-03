using System.Text.Json;
using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

public static class StarterWorkspaceFactory
{
    public static void Populate(Tenant tenant, User owner, DateTime now)
    {
        tenant.PlanType = "Enterprise";
        tenant.BaseCurrency = "USD";
        tenant.Status = "Active";

        var suffix = tenant.Id.ToString("N")[..8];
        var opsManager = new User
        {
            Id = Guid.NewGuid(),
            Email = $"ops.manager+{suffix}@demo.tenvora.internal",
            PasswordHash = Services.PasswordHasher.Hash("AdminPass123!"),
            Role = "OperationsManager",
            IsActive = true,
            Tenant = tenant,
            PreferredCurrency = "USD"
        };
        var complianceOfficer = new User
        {
            Id = Guid.NewGuid(),
            Email = $"compliance+{suffix}@demo.tenvora.internal",
            PasswordHash = Services.PasswordHasher.Hash("AdminPass123!"),
            Role = "ComplianceOfficer",
            IsActive = true,
            Tenant = tenant,
            PreferredCurrency = "USD"
        };

        tenant.Users.Add(opsManager);
        tenant.Users.Add(complianceOfficer);

        // Seed Customers
        var customer1 = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Acme Global Trade",
            Email = $"finance@acmetrade-{suffix}.com",
            Phone = "+1-555-0199",
            KycStatus = "Verified",
            Status = "Active",
            CreatedAt = now.AddDays(-30)
        };
        var customer2 = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Starlight Cloud Ltd",
            Email = $"billing@starlightcloud-{suffix}.com",
            Phone = "+1-555-0288",
            KycStatus = "Verified",
            Status = "Active",
            CreatedAt = now.AddDays(-20)
        };

        tenant.Customers.Add(customer1);
        tenant.Customers.Add(customer2);

        // Seed Accounts
        var operatingAccount = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            AccountNumber = $"OP-{suffix}-USD",
            AccountType = AccountTypes.Asset,
            Currency = "USD",
            CachedBalance = 1_000_000m,
            Status = AccountStatuses.Active,
            CreatedAt = now.AddDays(-30)
        };

        var acmeWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            CustomerId = customer1.Id,
            AccountNumber = $"WAL-ACME-{suffix}",
            AccountType = AccountTypes.Liability,
            Currency = "USD",
            CachedBalance = 250_000m,
            Status = AccountStatuses.Active,
            CreatedAt = now.AddDays(-30)
        };

        var starlightWallet = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            CustomerId = customer2.Id,
            AccountNumber = $"WAL-STAR-{suffix}",
            AccountType = AccountTypes.Liability,
            Currency = "USD",
            CachedBalance = 150_000m,
            Status = AccountStatuses.Active,
            CreatedAt = now.AddDays(-20)
        };

        tenant.Accounts.Add(operatingAccount);
        tenant.Accounts.Add(acmeWallet);
        tenant.Accounts.Add(starlightWallet);

        // Initial Seed Transaction & Balanced Double-Entry Ledger
        var txId = Guid.NewGuid();
        var initialTx = new Transaction
        {
            Id = txId,
            TenantId = tenant.Id,
            ReferenceNumber = $"TX-INIT-{suffix}-001",
            TransactionType = TransactionTypes.Transfer,
            Status = TransactionStatuses.Posted,
            Amount = 50_000m,
            Currency = "USD",
            Description = "Initial working capital transfer from Operating to Acme Wallet",
            CreatedAt = now.AddDays(-10),
            PostedAt = now.AddDays(-10)
        };

        var debitEntry = new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            TransactionId = txId,
            AccountId = acmeWallet.Id,
            EntryType = "Debit",
            DebitAmount = 50_000m,
            CreditAmount = 0m,
            Currency = "USD",
            PostedAt = now.AddDays(-10),
            Description = "Credit received from Operating Account"
        };

        var creditEntry = new LedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            TransactionId = txId,
            AccountId = operatingAccount.Id,
            EntryType = "Credit",
            DebitAmount = 0m,
            CreditAmount = 50_000m,
            Currency = "USD",
            PostedAt = now.AddDays(-10),
            Description = "Transfer out to Acme Wallet"
        };

        initialTx.LedgerEntries.Add(debitEntry);
        initialTx.LedgerEntries.Add(creditEntry);
        tenant.Transactions.Add(initialTx);
    }
}
