using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Data.Interceptors;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Models;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class PersonalDataDeletionTests
{
    private sealed record Fixture(
        User Member, User Other, Guid SaleId, Guid MyConversationId, Guid MyMessageId, Guid MyActionId,
        Guid TheirConversationId, Guid TheirActionId, Guid MyBusinessAuditId, Guid MyProfileAuditId,
        Guid TheirAuditId, string TheirToken);

    private static AppDbContext Open() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .AddInterceptors(new AuditLogSaveChangesInterceptor(new HttpContextAccessor())).Options);

    private static async Task<Fixture> Seed(AppDbContext db)
    {
        var tenant = new Tenant { Id = Guid.NewGuid(), CompanyName = "Partial deletion fixture", ApiKey = Guid.NewGuid().ToString(), PlanType = "Business" };
        var member = new User { Id = Guid.NewGuid(), TenantId = tenant.Id, Email = "member@test.invalid", Role = "TenantAdmin", PasswordHash = "hash" };
        var other = new User { Id = Guid.NewGuid(), TenantId = tenant.Id, Email = "other@test.invalid", Role = "TenantAdmin", PasswordHash = "hash" };
        db.AddRange(tenant, member, other);

        db.RefreshTokens.AddRange(
            new RefreshToken { Id = Guid.NewGuid(), UserId = member.Id, Token = "member-token", ExpiresAt = DateTime.UtcNow.AddDays(1) },
            new RefreshToken { Id = Guid.NewGuid(), UserId = other.Id, Token = "other-token", ExpiresAt = DateTime.UtcNow.AddDays(1) });

        var mine = new AiConversation { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = member.Id };
        var myMessage = new AiConversationMessage { Id = Guid.NewGuid(), TenantId = tenant.Id, Content = "Private question" };
        mine.Messages.Add(myMessage);
        var theirs = new AiConversation { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = other.Id };
        var theirMessage = new AiConversationMessage { Id = Guid.NewGuid(), TenantId = tenant.Id, Content = "Colleague question" };
        theirs.Messages.Add(theirMessage);
        db.AddRange(mine, theirs);

        var myAction = new AiAction { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = member.Id, Intent = "mine", SourceText = "mine", PayloadJson = "{}", IdempotencyKey = "mine", ExpiresAt = DateTime.UtcNow.AddMinutes(5) };
        var theirAction = new AiAction { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = other.Id, Intent = "theirs", SourceText = "theirs", PayloadJson = "{}", IdempotencyKey = "theirs", ExpiresAt = DateTime.UtcNow.AddMinutes(5) };
        db.AddRange(myAction, theirAction);

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Fixture customer" };
        var sale = new Sale { Id = Guid.NewGuid(), TenantId = tenant.Id, CustomerId = customer.Id, SaleNumber = "PARTIAL-1", Currency = "USD", TotalAmount = 5, IdempotencyKey = "partial", RequestHash = "hash" };
        db.AddRange(customer, sale);

        var myBusinessAudit = new AuditLog { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = member.Id, EntityType = "Sale", EntityId = sale.Id.ToString(), Action = "Created", PerformedBy = member.Email, IpAddress = "127.0.0.1" };
        var myProfileAudit = new AuditLog { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = member.Id, EntityType = "User", EntityId = member.Id.ToString(), Action = "Updated", PerformedBy = member.Email, OldValue = "{\"Email\":\"member@test.invalid\"}", IpAddress = "127.0.0.1" };
        var theirAudit = new AuditLog { Id = Guid.NewGuid(), TenantId = tenant.Id, UserId = other.Id, EntityType = "Sale", EntityId = sale.Id.ToString(), Action = "Created", PerformedBy = other.Email, IpAddress = "10.0.0.1" };
        db.AddRange(myBusinessAudit, myProfileAudit, theirAudit);

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        db.ChangeTracker.Clear();
        return new Fixture(member, other, sale.Id, mine.Id, myMessage.Id, myAction.Id,
            theirs.Id, theirAction.Id, myBusinessAudit.Id, myProfileAudit.Id, theirAudit.Id, "other-token");
    }

    [Fact]
    public async Task UnknownOrEmptyCategorySelectionDeletesNothing()
    {
        await using var db = Open(); var fixture = await Seed(db);
        var member = fixture.Member;
        var service = new PersonalDataDeletionService(db);
        Assert.False((await service.DeleteAsync(member.TenantId, member.Id, [])).Success);
        Assert.False((await service.DeleteAsync(member.TenantId, member.Id, ["everything"])).Success);

        Assert.Equal(2, db.Users.Count());
        Assert.Equal(2, db.RefreshTokens.Count());
        Assert.Equal(2, db.AiConversations.Count());
        Assert.Equal(2, db.AiConversationMessages.Count());
        Assert.Equal(2, db.AiActions.Count());
        Assert.Contains(db.AuditLogs, a => a.Id == fixture.MyBusinessAuditId);
        Assert.Contains(db.AuditLogs, a => a.Id == fixture.MyProfileAuditId);
        Assert.Contains(db.AuditLogs, a => a.Id == fixture.TheirAuditId);
    }

    [Fact]
    public async Task WrongTenantCannotDeleteAnotherMembersData()
    {
        await using var db = Open(); var fixture = await Seed(db);
        var member = fixture.Member;
        Assert.False((await new PersonalDataDeletionService(db).DeleteAsync(Guid.NewGuid(), member.Id, [PersonalDataDeletionService.AiHistory])).Success);
        Assert.Equal(2, db.AiConversations.Count());
        Assert.Contains(db.AuditLogs, a => a.Id == fixture.MyBusinessAuditId);
    }

    [Fact]
    public async Task AiHistoryDeletionKeepsMyAccountMyColleagueAndTheLedger()
    {
        await using var db = Open(); var fixture = await Seed(db);
        var member = fixture.Member;

        var result = await new PersonalDataDeletionService(db).DeleteAsync(member.TenantId, member.Id, [PersonalDataDeletionService.AiHistory]);
        Assert.True(result.Success, result.Message);
        db.ChangeTracker.Clear();

        Assert.Equal(2, db.Users.Count());
        Assert.Equal(2, db.RefreshTokens.Count());
        Assert.Equal(1, db.AiConversations.Count());
        Assert.Equal(1, db.AiConversationMessages.Count());
        Assert.Equal(1, db.AiActions.Count());
        Assert.Equal(fixture.TheirConversationId, db.AiConversations.Single().Id);
        Assert.Equal(fixture.TheirActionId, db.AiActions.Single().Id);
        Assert.Single(db.Sales);

        // Only my erased AI records lose their audit snapshots; the ledger history stays.
        Assert.Contains(db.AuditLogs, a => a.Id == fixture.MyBusinessAuditId);
        Assert.Contains(db.AuditLogs, a => a.Id == fixture.TheirAuditId);
        Assert.DoesNotContain(db.AuditLogs, a =>
            (a.EntityType is "AiConversation" or "AiConversationMessage" or "AiAction" or "AiMessageReport") &&
            (a.EntityId == fixture.MyConversationId.ToString() ||
             a.EntityId == fixture.MyMessageId.ToString() ||
             a.EntityId == fixture.MyActionId.ToString()));
        Assert.Contains(db.AuditLogs, a => a.EntityType == "AiConversation" && a.EntityId == fixture.TheirConversationId.ToString());
    }

    [Fact]
    public async Task ActivityTrailDeletionRemovesMyIdentityButKeepsTheBusinessHistory()
    {
        await using var db = Open(); var fixture = await Seed(db);
        var member = fixture.Member; var other = fixture.Other;

        var result = await new PersonalDataDeletionService(db).DeleteAsync(member.TenantId, member.Id, [PersonalDataDeletionService.ActivityTrail]);
        Assert.True(result.Success, result.Message);
        db.ChangeTracker.Clear();

        Assert.Equal(2, db.Users.Count());
        var mine = db.AuditLogs.Single(a => a.Id == fixture.MyBusinessAuditId);
        Assert.Null(mine.UserId);
        Assert.Null(mine.IpAddress);
        Assert.Equal("Identity removed", mine.PerformedBy);
        Assert.Equal(fixture.SaleId.ToString(), mine.EntityId);

        Assert.DoesNotContain(db.AuditLogs, a => a.Id == fixture.MyProfileAuditId);
        var theirs = db.AuditLogs.Single(a => a.Id == fixture.TheirAuditId);
        Assert.Equal(other.Id, theirs.UserId);
        Assert.Equal(other.Email, theirs.PerformedBy);
        Assert.Equal("10.0.0.1", theirs.IpAddress);
    }

    [Fact]
    public async Task SessionDeletionRevokesOnlyMyTokensAndKeepsEverythingElse()
    {
        await using var db = Open(); var fixture = await Seed(db);
        var member = fixture.Member;

        var result = await new PersonalDataDeletionService(db).DeleteAsync(member.TenantId, member.Id, [PersonalDataDeletionService.Sessions]);
        Assert.True(result.Success, result.Message);
        db.ChangeTracker.Clear();

        Assert.Equal(2, db.Users.Count());
        Assert.False(db.RefreshTokens.Any(t => t.UserId == member.Id));
        Assert.Contains(db.RefreshTokens, t => t.Token == fixture.TheirToken);
        Assert.Equal(2, db.AiConversations.Count());
        Assert.Equal(3, db.AuditLogs.Count(a => a.Id == fixture.MyBusinessAuditId || a.Id == fixture.MyProfileAuditId || a.Id == fixture.TheirAuditId));
    }

    [Fact]
    public async Task EveryCategoryTogetherErasesPersonalDataWithoutDeletingTheAccount()
    {
        await using var db = Open(); var fixture = await Seed(db);
        var member = fixture.Member;

        var result = await new PersonalDataDeletionService(db).DeleteAsync(
            member.TenantId, member.Id,
            [PersonalDataDeletionService.AiHistory, PersonalDataDeletionService.ActivityTrail, PersonalDataDeletionService.Sessions]);
        Assert.True(result.Success, result.Message);
        db.ChangeTracker.Clear();

        Assert.Equal(2, db.Users.Count());
        Assert.Single(db.Tenants);
        Assert.False(db.RefreshTokens.Any(t => t.UserId == member.Id));
        Assert.Contains(db.RefreshTokens, t => t.Token == fixture.TheirToken);
        Assert.Equal(fixture.TheirConversationId, Assert.Single(db.AiConversations).Id);
        Assert.Single(db.AiConversationMessages);
        Assert.Equal(fixture.TheirActionId, Assert.Single(db.AiActions).Id);
        Assert.Single(db.Sales);

        var mine = db.AuditLogs.Single(a => a.Id == fixture.MyBusinessAuditId);
        Assert.Null(mine.UserId);
        Assert.Equal("Identity removed", mine.PerformedBy);
        Assert.DoesNotContain(db.AuditLogs, a => a.Id == fixture.MyProfileAuditId);
        Assert.Equal(fixture.Other.Id, db.AuditLogs.Single(a => a.Id == fixture.TheirAuditId).UserId);
    }

    [PostgresFact]
    public async Task PostgreSqlEraseRunsAsSetBasedDeletesWithoutTouchingSharedRows()
    {
        await using var fixture = new PostgresWorkflowTests.Database(); await fixture.Initialize();
        await using var seed = fixture.Open(); var data = await Seed(seed);
        var member = data.Member;
        await using var db = fixture.Open();
        var result = await new PersonalDataDeletionService(db).DeleteAsync(
            member.TenantId, member.Id,
            [PersonalDataDeletionService.AiHistory, PersonalDataDeletionService.ActivityTrail, PersonalDataDeletionService.Sessions]);
        Assert.True(result.Success, result.Message);

        await using var verify = fixture.Open();
        Assert.Equal(2, await verify.Users.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(1, await verify.AiConversations.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(data.TheirConversationId, await verify.AiConversations.Select(c => c.Id).SingleAsync(TestContext.Current.CancellationToken));
        Assert.Equal(0, await verify.RefreshTokens.CountAsync(t => t.UserId == member.Id, TestContext.Current.CancellationToken));
        Assert.Equal(1, await verify.Sales.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(0, await verify.AuditLogs.CountAsync(a => a.UserId == member.Id, TestContext.Current.CancellationToken));
        Assert.Equal(1, await verify.AuditLogs.CountAsync(a => a.Id == data.TheirAuditId, TestContext.Current.CancellationToken));
    }
}