using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;

namespace Tenvora.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Database.IsRelational())
        {
            await context.Database.MigrateAsync();

            // Temporarily disable RLS during initial seeding so multi-tenant seed data can be written
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Tenants\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Users\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Accounts\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Customers\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Transactions\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"LedgerEntries\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"PaymentRequests\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"IdempotencyRecords\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"SettlementBatches\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"SettlementEntries\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"ReconciliationRuns\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"ReconciliationDiscrepancies\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"RiskEvaluations\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"AuditLogs\" DISABLE ROW LEVEL SECURITY");
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"RefreshTokens\" DISABLE ROW LEVEL SECURITY");
            }
            catch
            {
                // Ignore if tables don't exist yet or not supported
            }
        }

        try
        {
            if (await context.Tenants.AnyAsync())
            {
                return;
            }

            var now = DateTime.UtcNow;

            var tenantName = Environment.GetEnvironmentVariable("SEED_TENANT_NAME")?.Trim();
            if (string.IsNullOrWhiteSpace(tenantName)) tenantName = "Global FinOps Corp";

            var tenantApiKey = Environment.GetEnvironmentVariable("SEED_TENANT_API_KEY")?.Trim();
            if (string.IsNullOrWhiteSpace(tenantApiKey)) tenantApiKey = "tenvora-dev-key-default";

            var adminEmail = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL")?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(adminEmail)) adminEmail = "admin@tenvora.internal";

            var adminPassword = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD")?.Trim();
            if (string.IsNullOrWhiteSpace(adminPassword)) adminPassword = "AdminPass123!";

            var opsEmail = Environment.GetEnvironmentVariable("SEED_OPS_EMAIL")?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(opsEmail)) opsEmail = "ops.manager@tenvora.internal";

            var opsPassword = Environment.GetEnvironmentVariable("SEED_OPS_PASSWORD")?.Trim();
            if (string.IsNullOrWhiteSpace(opsPassword)) opsPassword = adminPassword;

            var complianceEmail = Environment.GetEnvironmentVariable("SEED_COMPLIANCE_EMAIL")?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(complianceEmail)) complianceEmail = "compliance@tenvora.internal";

            var compliancePassword = Environment.GetEnvironmentVariable("SEED_COMPLIANCE_PASSWORD")?.Trim();
            if (string.IsNullOrWhiteSpace(compliancePassword)) compliancePassword = adminPassword;

            // Primary Enterprise Tenant
            var tenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var tenant = new Tenant
            {
                Id = tenantId,
                CompanyName = tenantName,
                ApiKey = tenantApiKey,
                PlanType = "Enterprise",
                BaseCurrency = "USD",
                Status = "Active",
                CreatedAt = now.AddDays(-60),
                UpdatedAt = now.AddDays(-60)
            };

            context.Tenants.Add(tenant);

            // Enterprise Users
            var adminUser = new User
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                TenantId = tenantId,
                Email = adminEmail,
                PasswordHash = Services.PasswordHasher.Hash(adminPassword),
                Role = "TenantAdmin",
                IsActive = true,
                PreferredCurrency = "USD",
                CreatedAt = now.AddDays(-60)
            };

            var opsManager = new User
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                TenantId = tenantId,
                Email = opsEmail,
                PasswordHash = Services.PasswordHasher.Hash(opsPassword),
                Role = "OperationsManager",
                IsActive = true,
                PreferredCurrency = "USD",
                CreatedAt = now.AddDays(-55)
            };

            var complianceOfficer = new User
            {
                Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                TenantId = tenantId,
                Email = complianceEmail,
                PasswordHash = Services.PasswordHasher.Hash(compliancePassword),
                Role = "ComplianceOfficer",
                IsActive = true,
                PreferredCurrency = "USD",
                CreatedAt = now.AddDays(-50)
            };

            context.Users.AddRange(adminUser, opsManager, complianceOfficer);

            // Customers / Merchants
            var merchantAcme = new Customer
            {
                Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                TenantId = tenantId,
                Name = "Acme Retail Enterprise",
                Email = "treasury@acmeretail.com",
                Phone = "+1-555-0100",
                KycStatus = "Verified",
                Status = "Active",
                CreatedAt = now.AddDays(-45)
            };

            var merchantNexus = new Customer
            {
                Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                TenantId = tenantId,
                Name = "Nexus Cloud Logistics",
                Email = "payments@nexuslogistics.com",
                Phone = "+1-555-0200",
                KycStatus = "Verified",
                Status = "Active",
                CreatedAt = now.AddDays(-40)
            };

            context.Customers.AddRange(merchantAcme, merchantNexus);

            // Accounts
            var treasuryAccount = new Account
            {
                Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
                TenantId = tenantId,
                AccountNumber = "ACC-TREASURY-001",
                AccountType = AccountTypes.Asset,
                Currency = "USD",
                CachedBalance = 5_525_000m,
                Status = AccountStatuses.Active,
                CreatedAt = now.AddDays(-45)
            };

            var equityAccount = new Account
            {
                Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                TenantId = tenantId,
                AccountNumber = "ACC-EQUITY-POOL",
                AccountType = AccountTypes.Equity,
                Currency = "USD",
                CachedBalance = 5_000_000m,
                Status = AccountStatuses.Active,
                CreatedAt = now.AddDays(-45)
            };

            var acmeWallet = new Account
            {
                Id = Guid.Parse("88888888-8888-8888-8888-888888888888"),
                TenantId = tenantId,
                CustomerId = merchantAcme.Id,
                AccountNumber = "ACC-ACME-WALLET",
                AccountType = AccountTypes.Liability,
                Currency = "USD",
                CachedBalance = 325_000m,
                Status = AccountStatuses.Active,
                CreatedAt = now.AddDays(-45)
            };

            var nexusWallet = new Account
            {
                Id = Guid.Parse("99999999-9999-9999-9999-999999999999"),
                TenantId = tenantId,
                CustomerId = merchantNexus.Id,
                AccountNumber = "ACC-NEXUS-WALLET",
                AccountType = AccountTypes.Liability,
                Currency = "USD",
                CachedBalance = 200_000m,
                Status = AccountStatuses.Active,
                CreatedAt = now.AddDays(-40)
            };

            var clearingAccount = new Account
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                TenantId = tenantId,
                AccountNumber = "ACC-CLEARING-USD",
                AccountType = AccountTypes.Clearing,
                Currency = "USD",
                CachedBalance = 0m,
                Status = AccountStatuses.Active,
                CreatedAt = now.AddDays(-45)
            };

            context.Accounts.AddRange(treasuryAccount, equityAccount, acmeWallet, nexusWallet, clearingAccount);

            // Seed Initial Capital Journal (Assets = Equity)
            var initTxId = Guid.NewGuid();
            var initTx = new Transaction
            {
                Id = initTxId,
                TenantId = tenantId,
                ReferenceNumber = "TX-INIT-001",
                TransactionType = "CapitalContribution",
                Status = TransactionStatuses.Posted,
                Amount = 5_000_000m,
                Currency = "USD",
                Description = "Initial Treasury Capital Provisioning",
                CreatedAt = now.AddDays(-45),
                PostedAt = now.AddDays(-45)
            };

            var initDebit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = initTxId,
                AccountId = treasuryAccount.Id,
                EntryType = "Debit",
                DebitAmount = 5_000_000m,
                CreditAmount = 0m,
                Currency = "USD",
                PostedAt = now.AddDays(-45),
                Description = "Treasury Operating Asset Capital"
            };

            var initCredit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = initTxId,
                AccountId = equityAccount.Id,
                EntryType = "Credit",
                DebitAmount = 0m,
                CreditAmount = 5_000_000m,
                Currency = "USD",
                PostedAt = now.AddDays(-45),
                Description = "Enterprise Paid-In Capital Pool"
            };

            // Seed Customer Deposit Journals (Treasury Asset Debit, Customer Liability Credit)
            var acmeDepTxId = Guid.NewGuid();
            var acmeDepTx = new Transaction
            {
                Id = acmeDepTxId,
                TenantId = tenantId,
                ReferenceNumber = "TX-DEP-001",
                TransactionType = "Deposit",
                Status = TransactionStatuses.Posted,
                Amount = 350_000m,
                Currency = "USD",
                Description = "Acme Retail Initial Treasury Deposit",
                CreatedAt = now.AddDays(-45),
                PostedAt = now.AddDays(-45)
            };
            var acmeDepDebit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = acmeDepTxId,
                AccountId = treasuryAccount.Id,
                EntryType = "Debit",
                DebitAmount = 350_000m,
                CreditAmount = 0m,
                Currency = "USD",
                PostedAt = now.AddDays(-45),
                Description = "Acme Deposit Funds Inward"
            };
            var acmeDepCredit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = acmeDepTxId,
                AccountId = acmeWallet.Id,
                EntryType = "Credit",
                DebitAmount = 0m,
                CreditAmount = 350_000m,
                Currency = "USD",
                PostedAt = now.AddDays(-45),
                Description = "Acme Wallet Credit"
            };

            var nexusDepTxId = Guid.NewGuid();
            var nexusDepTx = new Transaction
            {
                Id = nexusDepTxId,
                TenantId = tenantId,
                ReferenceNumber = "TX-DEP-002",
                TransactionType = "Deposit",
                Status = TransactionStatuses.Posted,
                Amount = 175_000m,
                Currency = "USD",
                Description = "Nexus Logistics Initial Treasury Deposit",
                CreatedAt = now.AddDays(-40),
                PostedAt = now.AddDays(-40)
            };
            var nexusDepDebit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = nexusDepTxId,
                AccountId = treasuryAccount.Id,
                EntryType = "Debit",
                DebitAmount = 175_000m,
                CreditAmount = 0m,
                Currency = "USD",
                PostedAt = now.AddDays(-40),
                Description = "Nexus Deposit Funds Inward"
            };
            var nexusDepCredit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = nexusDepTxId,
                AccountId = nexusWallet.Id,
                EntryType = "Credit",
                DebitAmount = 0m,
                CreditAmount = 175_000m,
                Currency = "USD",
                PostedAt = now.AddDays(-40),
                Description = "Nexus Wallet Credit"
            };

            // Seed Payment Request & B2B Transfer Transaction
            var pReqId = Guid.NewGuid();
            var paymentRequest = new PaymentRequest
            {
                Id = pReqId,
                TenantId = tenantId,
                IdempotencyKey = "idem-key-acme-transfer-001",
                SourceAccountId = acmeWallet.Id,
                DestinationAccountId = nexusWallet.Id,
                Amount = 25_000m,
                Currency = "USD",
                Purpose = "Wholesale Inventory Clearing",
                Status = TransactionStatuses.Posted,
                CreatedAt = now.AddDays(-5),
                UpdatedAt = now.AddDays(-5)
            };

            var txId = Guid.NewGuid();
            var transaction = new Transaction
            {
                Id = txId,
                TenantId = tenantId,
                PaymentRequestId = pReqId,
                ReferenceNumber = "TX-2026-00001",
                TransactionType = TransactionTypes.Transfer,
                Status = TransactionStatuses.Posted,
                Amount = 25_000m,
                Currency = "USD",
                Description = "B2B Payment: Acme Retail -> Nexus Logistics",
                CreatedAt = now.AddDays(-5),
                PostedAt = now.AddDays(-5)
            };

            // For liability accounts: Acme debit (reduces liability), Nexus credit (increases liability)
            var transferDebit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = txId,
                AccountId = acmeWallet.Id,
                EntryType = "Debit",
                DebitAmount = 25_000m,
                CreditAmount = 0m,
                Currency = "USD",
                PostedAt = now.AddDays(-5),
                Description = "B2B Transfer to Nexus Logistics"
            };

            var transferCredit = new LedgerEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TransactionId = txId,
                AccountId = nexusWallet.Id,
                EntryType = "Credit",
                DebitAmount = 0m,
                CreditAmount = 25_000m,
                Currency = "USD",
                PostedAt = now.AddDays(-5),
                Description = "B2B Transfer received from Acme Retail"
            };

            context.PaymentRequests.Add(paymentRequest);
            context.Transactions.AddRange(initTx, acmeDepTx, nexusDepTx, transaction);
            context.LedgerEntries.AddRange(
                initDebit, initCredit,
                acmeDepDebit, acmeDepCredit,
                nexusDepDebit, nexusDepCredit,
                transferDebit, transferCredit);

            // Seed AuditLog
            context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = adminUser.Id,
                Action = "SeedDatabase",
                EntityType = "System",
                EntityId = tenantId.ToString(),
                PerformedBy = "System / DatabaseSeeder",
                Timestamp = now,
                Notes = "Tenvora Enterprise database seeded with initial organization, accounts, and balanced double-entry ledger."
            });

            await context.SaveChangesAsync();
        }
        finally
        {
            if (context.Database.IsRelational())
            {
                try
                {
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Tenants\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Users\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Accounts\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Customers\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"Transactions\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"LedgerEntries\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"PaymentRequests\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"IdempotencyRecords\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"SettlementBatches\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"SettlementEntries\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"ReconciliationRuns\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"ReconciliationDiscrepancies\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"RiskEvaluations\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"AuditLogs\" ENABLE ROW LEVEL SECURITY");
                    await context.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS \"RefreshTokens\" ENABLE ROW LEVEL SECURITY");
                }
                catch
                {
                    // Ignore on non-PostgreSQL providers
                }
            }
        }
    }
}
