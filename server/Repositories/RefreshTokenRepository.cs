using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public sealed class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _context;

    public RefreshTokenRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<RefreshToken?> GetByTokenAsync(string token)
    {
        return _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == token);
    }

    public async Task AddAsync(RefreshToken token)
    {
        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();
    }

    public async Task RevokeUserTokensAsync(Guid userId)
    {
        var tokens = await _context.RefreshTokens
            .Where(r => r.UserId == userId && !r.Revoked)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.Revoked = true;
        }

        await _context.SaveChangesAsync();
    }
}
