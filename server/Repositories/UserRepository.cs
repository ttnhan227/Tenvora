using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Data;
using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<User?> GetByIdAsync(Guid userId)
    {
        return _context.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.Id == userId);
    }

    public Task<User?> GetByEmailAsync(string email)
    {
        return _context.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.Email == email);
    }

    public Task<User?> GetByEmailAndTenantAsync(string email, Guid tenantId)
    {
        return _context.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);
    }

    public Task<User?> GetByInviteTokenAsync(string token)
    {
        // Token lookup is case-sensitive; normalize for comparison
        var normalizedToken = token.Trim();
        return _context.Users.Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.InviteToken != null && u.InviteToken.Equals(normalizedToken, StringComparison.Ordinal) && u.InviteTokenExpiresAt > DateTime.UtcNow);
    }

    public async Task<IEnumerable<User>> GetAllByTenantAsync(Guid tenantId)
    {
        return await _context.Users.Where(u => u.TenantId == tenantId).ToListAsync();
    }

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
}
