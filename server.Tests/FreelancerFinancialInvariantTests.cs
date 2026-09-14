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

public sealed class FreelancerFinancialInvariantTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase($"financial-invariants-{Guid.NewGuid()}")
        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);

    private static async Task<(Guid TenantId, Invoice Invoice, Account Wallet)> InvoiceFixture(AppDbContext db)
    {
        var tenantId = Guid.NewGuid();
        var tenant = new Tenant { Id = tenantId, CompanyName = "Northwind Studio", ApiKey = Guid.NewGuid().ToString("N"),
            BaseCurrency = "USD", AutoTaxSetAsideEnabled = false };
        var client = new Client { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Cedar & Co", ContactEmail = "billing@cedar.example", Currency = "USD" };
        var wallet = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-USD", AccountType = AccountTypes.Asset, Currency = "USD", Status = AccountStatuses.Active };
        db.AddRange(tenant, client, wallet);
        await db.SaveChangesAsync();
        var service = new InvoiceService(db);
        var created = await service.CreateInvoiceAsync(tenantId, new CreateInvoiceRequest(client.Id, "INV-1001", null, null,
            "USD", 0, "Net 14", null, wallet.Id, [new InvoiceItemRequest("Product design", 1, 1_000m)]));
        Assert.True(created.Success);
        var sent = await service.SendInvoiceAsync(tenantId, created.Data!.Id);
        Assert.True(sent.Success);
        return (tenantId, await db.Invoices.SingleAsync(), wallet);
    }

    [Fact]
    public async Task InvoicePayments_AreIdempotent_AndStatusReflectsFinancialReality()
    {
        await using var db = Db();
        var fixture = await InvoiceFixture(db);
        var service = new InvoiceService(db);

        var first = await service.PayInvoiceAsync(fixture.TenantId, fixture.Invoice.Id, "bank-event-001", new PayInvoiceRequest(400m, false, "DEP-001"));
        var retry = await service.PayInvoiceAsync(fixture.TenantId, fixture.Invoice.Id, "bank-event-001", new PayInvoiceRequest(400m, false, "DEP-001"));

        Assert.True(first.Success);
        Assert.True(retry.Success);
        Assert.Equal(InvoiceStatuses.PartiallyPaid, retry.Data!.Status);
        Assert.Equal(400m, retry.Data.AmountPaid);
        Assert.Null(retry.Data.PaidAt);
        Assert.Single(await db.InvoicePayments.ToListAsync());
        Assert.Single(await db.Transactions.Where(t => t.TransactionType == TransactionTypes.InvoicePayment).ToListAsync());

        var final = await service.PayInvoiceAsync(fixture.TenantId, fixture.Invoice.Id, "bank-event-002", new PayInvoiceRequest(600m, false));
        Assert.True(final.Success);
        Assert.Equal(InvoiceStatuses.Paid, final.Data!.Status);
        Assert.NotNull(final.Data.PaidAt);
        Assert.Equal(1_000m, final.Data.AmountPaid);
        Assert.Equal(2, final.Data.Payments.Count);
        Assert.Equal(1_000m, (await db.Accounts.FindAsync(fixture.Wallet.Id))!.CachedBalance);
    }

    [Fact]
    public async Task InvoiceLifecycle_RejectsDraftPayments_AndPreservesIssuedHistory()
    {
        await using var db = Db();
        var fixture = await InvoiceFixture(db);
        var service = new InvoiceService(db);

        var cancel = await service.CancelInvoiceAsync(fixture.TenantId, fixture.Invoice.Id, new("Client stopped the work"));
        Assert.True(cancel.Success);
        Assert.Equal(InvoiceStatuses.Cancelled, cancel.Data!.Status);
        Assert.False((await service.SendInvoiceAsync(fixture.TenantId, fixture.Invoice.Id)).Success);
        Assert.False((await service.PayInvoiceAsync(fixture.TenantId, fixture.Invoice.Id, "cancelled-payment", new(100m, false))).Success);
        Assert.False((await service.DeleteInvoiceAsync(fixture.TenantId, fixture.Invoice.Id)).Success);
        Assert.Single(db.Invoices);
    }

    [Fact]
    public async Task ExpenseRetryAndVoid_CreateOneWriteThenCompensatingHistory()
    {
        await using var db = Db();
        var tenantId = Guid.NewGuid();
        var tenant = new Tenant { Id = tenantId, CompanyName = "Juniper Creative", ApiKey = Guid.NewGuid().ToString("N"), BaseCurrency = "USD" };
        var wallet = new Account { Id = Guid.NewGuid(), TenantId = tenantId, AccountNumber = "MAIN-USD", AccountType = AccountTypes.Asset, Currency = "USD", Status = AccountStatuses.Active, CachedBalance = 500m };
        db.AddRange(tenant, wallet);
        await db.SaveChangesAsync();
        var service = new ExpenseService(db);
        var request = new CreateExpenseRequest(wallet.Id, null, null, "Figma", "Software", "Monthly plan", "CARD-42", 40m, "USD", DateTime.UtcNow.Date);

        var first = await service.CreateAsync(tenantId, "card-charge-42", request);
        var retry = await service.CreateAsync(tenantId, "card-charge-42", request);
        Assert.True(first.Success);
        Assert.Equal(first.Data!.Id, retry.Data!.Id);
        Assert.Single(db.Expenses);
        Assert.Equal(460m, (await db.Accounts.FindAsync(wallet.Id))!.CachedBalance);
        Assert.Equal(2, await db.LedgerEntries.CountAsync());

        var voided = await service.VoidAsync(tenantId, first.Data.Id, new("Duplicate card charge"));
        Assert.True(voided.Success);
        Assert.Equal(ExpenseStatuses.Void, voided.Data!.Status);
        Assert.Equal(500m, (await db.Accounts.FindAsync(wallet.Id))!.CachedBalance);
        Assert.Equal(2, await db.Transactions.CountAsync());
        Assert.Equal(4, await db.LedgerEntries.CountAsync());
    }

    [Fact]
    public async Task ProjectQueries_DoNotReturnAnotherWorkspaceProject()
    {
        await using var db = Db();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var client = new Client { Id = Guid.NewGuid(), TenantId = tenantB, Name = "Foreign Client", ContactEmail = "foreign@example.test" };
        var project = new Project { Id = Guid.NewGuid(), TenantId = tenantB, ClientId = client.Id, Name = "Private engagement", Currency = "USD" };
        db.AddRange(client, project);
        await db.SaveChangesAsync();

        var service = new ProjectService(db);
        Assert.Empty((await service.GetAsync(tenantA, null, null, null)).Data!);
        Assert.False((await service.GetByIdAsync(tenantA, project.Id)).Success);
    }
}
