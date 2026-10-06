using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Models;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class AccountDeletionTests
{
    private static AppDbContext Open() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .AddInterceptors(new AuditLogSaveChangesInterceptor(new HttpContextAccessor())).Options);

    private static async Task<User> Seed(AppDbContext db)
    {
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Deletion fixture", ApiKey = Guid.NewGuid().ToString(), PlanType = "Business" };
        var user = new User { Id = Guid.NewGuid(), TenantId = tenant.Id, Email = "delete@test.invalid", Role = "TenantAdmin", PasswordHash = "hash" };
        db.AddRange(tenant, user);
        db.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), UserId = user.Id, Token = "test", ExpiresAt = DateTime.UtcNow.AddDays(1) });
        var conversation = new AiConversation { TenantId = tenant.Id, UserId = user.Id };
        conversation.Messages.Add(new AiConversationMessage { TenantId = tenant.Id, Content = "Private fixture" });
        db.Add(conversation);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [Fact]
    public async Task WrongConfirmationAndOtherTenantCannotDeleteAccount()
    {
        await using var db = Open(); var user = await Seed(db); var service = new AccountDeletionService(db);
        Assert.False((await service.DeleteAsync(user.TenantId, user.Id, "wrong@test.invalid")).Success);
        Assert.False((await service.DeleteAsync(Guid.NewGuid(), user.Id, user.Email)).Success);
        Assert.Single(db.Users); Assert.Single(db.RefreshTokens);
    }

    [Fact]
    public async Task SoleAccountErasesWorkspaceAndDoesNotRecreateAuditSnapshots()
    {
        await using var db = Open(); var user = await Seed(db);
        var result = await new AccountDeletionService(db).DeleteAsync(user.TenantId, user.Id, user.Email);
        Assert.True(result.Success, result.Message);
        Assert.Empty(db.Users); Assert.Empty(db.Tenants); Assert.Empty(db.RefreshTokens);
        Assert.Empty(db.AiConversations); Assert.Empty(db.AiConversationMessages);
        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task LastTeamAdministratorCannotAbandonOtherMembers()
    {
        await using var db = Open(); var user = await Seed(db);
        db.Users.Add(new User { Id = Guid.NewGuid(), TenantId = user.TenantId, Email = "team@test.invalid", PasswordHash = "hash", Role = "ReadOnly" });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        var result = await new AccountDeletionService(db).DeleteAsync(user.TenantId, user.Id, user.Email);
        Assert.False(result.Success); Assert.Equal(2, db.Users.Count());
    }

    [Fact]
    public async Task SharedAccountDeletionPreservesOtherMembersAndAnonymizesHistory()
    {
        await using var db = Open(); var user = await Seed(db);
        var other = new User { Id = Guid.NewGuid(), TenantId = user.TenantId, Email = "admin@test.invalid", PasswordHash = "hash", Role = "TenantAdmin" };
        db.Add(other);
        db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), TenantId = user.TenantId, UserId = user.Id, PerformedBy = user.Email, EntityType = "Sale", EntityId = "sale", Action = "Created", IpAddress = "127.0.0.1" });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        db.ChangeTracker.Clear();
        Assert.True((await new AccountDeletionService(db).DeleteAsync(user.TenantId, user.Id, user.Email)).Success);
        Assert.Equal(other.Id, Assert.Single(db.Users).Id); Assert.Single(db.Tenants);
        var audit = Assert.Single(db.AuditLogs, a => a.EntityType == "Sale");
        Assert.Null(audit.UserId); Assert.Null(audit.IpAddress); Assert.Equal("Deleted account", audit.PerformedBy);
        Assert.Empty(db.RefreshTokens); Assert.Empty(db.AiConversationMessages);
        Assert.DoesNotContain(db.AuditLogs, a => a.EntityType == "AiConversation" || a.EntityType == "AiConversationMessage");
    }

    [PostgresFact]
    public async Task ConcurrentDeletionAndDeactivationCannotRemoveAllAdministrators()
    {
        await using var fixture = new PostgresWorkflowTests.Database(); await fixture.Initialize();
        await using var seed = fixture.Open(); var first = await Seed(seed);
        var second = new User { Id = Guid.NewGuid(), TenantId = first.TenantId, Email = "other@test.invalid", PasswordHash = "hash", Role = "TenantAdmin" };
        seed.Add(second); await seed.SaveChangesAsync(TestContext.Current.CancellationToken);
        async Task<bool> Delete()
        {
            await using var db = fixture.Open();
            return (await new AccountDeletionService(db).DeleteAsync(first.TenantId,first.Id,first.Email)).Success;
        }
        async Task<bool> Deactivate()
        {
            await using var db = fixture.Open();
            return (await new AdminUserService(new Tenvora.Api.Repositories.UserRepository(db),db).ToggleUserActiveAsync(first.TenantId,second.Id)).Success;
        }
        var outcomes = await Task.WhenAll(Delete(),Deactivate());
        Assert.Single(outcomes, result => result);
        await using var verify = fixture.Open();
        Assert.Equal(1, await verify.Users.CountAsync(u => u.TenantId == first.TenantId && u.Role == "TenantAdmin" && u.IsActive, TestContext.Current.CancellationToken));
    }

    [PostgresFact]
    public async Task PostgreSqlErasesPopulatedWorkspaceWithoutForeignKeyFailures()
    {
        await using var fixture = new PostgresWorkflowTests.Database(); await fixture.Initialize();
        await using var db = fixture.Open(); var user = await Seed(db);
        var customer = new Customer { Id = Guid.NewGuid(), TenantId = user.TenantId, Name = "Test customer" };
        var product = new Product { Id = Guid.NewGuid(), TenantId = user.TenantId, Name = "Test product", Unit = "each", Currency = "USD" };
        var sale = new Sale { Id = Guid.NewGuid(), TenantId = user.TenantId, CustomerId = customer.Id, SaleNumber = "DELETE-TEST", Currency = "USD", TotalAmount = 1, IdempotencyKey = "sale", RequestHash = "hash" };
        db.AddRange(customer, product, sale);
        db.SaleItems.Add(new SaleItem { Id = Guid.NewGuid(), TenantId = user.TenantId, SaleId = sale.Id, ProductId = product.Id, ProductName = product.Name, Unit = "each", Quantity = 1 });
        db.BusinessPayments.Add(new Payment { Id = Guid.NewGuid(), TenantId = user.TenantId, SaleId = sale.Id, CustomerId = customer.Id, Currency = "USD", Amount = 1, IdempotencyKey = "payment", RequestHash = "hash" });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        db.ChangeTracker.Clear();
        Assert.True((await new AccountDeletionService(db).DeleteAsync(user.TenantId, user.Id, user.Email)).Success);
        Assert.Empty(db.Users); Assert.Empty(db.SaleItems); Assert.Empty(db.BusinessPayments); Assert.Empty(db.Products); Assert.Empty(db.Customers);
    }
}
