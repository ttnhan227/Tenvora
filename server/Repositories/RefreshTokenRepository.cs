using Microsoft.EntityFrameworkCore;
using VeriSpend.Api.Data;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public sealed class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _context;

    public RefreshTokenRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<RefreshToken?> GetByTokenAsync(string token)
    {
        return _context.RefreshTokens.Include(rt => rt.User).ThenInclude(u => u.Tenant).FirstOrDefaultAsync(rt => rt.Token == token);
    }

    public Task AddAsync(RefreshToken refreshToken)
    {
        _context.RefreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
}