using Microsoft.EntityFrameworkCore.Storage;
using Tenvora.Api.Models;

namespace Tenvora.Api.Repositories;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid tenantId);
    Task<Tenant?> GetByApiKeyAsync(string apiKey);
    Task<IEnumerable<Tenant>> GetAllAsync();
    Task<bool> CompanyExistsAsync(string companyName);
    Task AddAsync(Tenant tenant);
    Task UpdateAsync(Tenant tenant);
    Task SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();
}
