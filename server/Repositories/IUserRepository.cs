using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid userId);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByEmailAndTenantAsync(string email, Guid tenantId);
    Task<User?> GetByInviteTokenAsync(string token);
    Task<IEnumerable<User>> GetAllByTenantAsync(Guid tenantId);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task SaveChangesAsync();
}
