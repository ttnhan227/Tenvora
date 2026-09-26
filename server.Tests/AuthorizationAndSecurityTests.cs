using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Models;
using Tenvora.Api.Repositories;
using Tenvora.Api.Services;
using Xunit;

namespace Tenvora.Tests;

public sealed class AuthorizationAndSecurityTests
{
    private static AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task RefreshTokenLookupHashesThePresentedCredential()
    {
        await using var db = Db();
        var raw = "one-time-browser-refresh-credential";
        var user = new User { Id = Guid.NewGuid(), TenantId = Guid.NewGuid(), Email = "owner@example.test", PasswordHash = "unused" };
        db.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), UserId = user.Id, User = user,
            Token = TokenService.HashRefreshToken(raw), ExpiresAt = DateTime.UtcNow.AddDays(1) });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var stored = await db.RefreshTokens.AsNoTracking().SingleAsync(TestContext.Current.CancellationToken);
        Assert.NotEqual(raw, stored.Token);
        Assert.Equal(64, stored.Token.Length);
        Assert.NotNull(await new RefreshTokenRepository(db).GetByTokenAsync(raw));
    }

    [Fact]
    public async Task TeamCreationRejectsUnknownRoles()
    {
        await using var db = Db();
        var service = new AdminUserService(new UserRepository(db));
        Assert.False((await service.CreateUserAsync(Guid.NewGuid(), new("member@example.test", "Password123!", "SuperUser"))).Success);
        Assert.Empty(db.Users);
    }
}
