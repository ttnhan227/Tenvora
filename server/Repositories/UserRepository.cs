using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using VeriSpend.Api.Data;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<User?> GetByEmailAsync(string email)
    {
        return _context.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.Email == email);
    }

    public Task<User?> GetByIdAsync(Guid id)
    {
        return _context.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.Id == id);
    }

    public Task<User?> GetByInviteTokenAsync(string inviteToken)
    {
        return _context.Users.Include(u => u.Tenant).FirstOrDefaultAsync(u => u.InviteToken == inviteToken);
    }

    public Task<User?> GetByIdAndTenantAsync(Guid id, Guid tenantId)
    {
        return _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);
    }

    public Task<User?> GetByEmailAndTenantAsync(string email, Guid tenantId)
    {
        return _context.Users.FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);
    }

    public Task<List<User>> GetByTenantIdAsync(Guid tenantId)
    {
        return _context.Users
            .Where(u => u.TenantId == tenantId)
            .OrderBy(u => u.Email)
            .ToListAsync();
    }

    public Task<int> CountByRoleAsync(Guid tenantId, string role)
    {
        return _context.Users.CountAsync(u => u.TenantId == tenantId && u.Role == role);
    }

    public Task<bool> EmailExistsAsync(string email)
    {
        return _context.Users.AnyAsync(u => u.Email == email);
    }

    public Task AddAsync(User user)
    {
        _context.Users.Add(user);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }

    public Task<IDbContextTransaction> BeginTransactionAsync()
    {
        return _context.Database.BeginTransactionAsync();
    }

    public Task ExecuteSqlRawAsync(string sql, params object[] parameters)
    {
        return _context.Database.ExecuteSqlRawAsync(sql, parameters);
    }
}
