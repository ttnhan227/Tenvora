using Microsoft.EntityFrameworkCore.Storage;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Repositories;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid tenantId);
    Task<IEnumerable<Tenant>> GetAllAsync();
    Task<bool> CompanyExistsAsync(string companyName);
    Task AddAsync(Tenant tenant);
    Task SaveChangesAsync();
    Task<Tenant?> GetBySlackTeamIdAsync(string slackTeamId);
    Task<IDbContextTransaction> BeginTransactionAsync();
    Task ExecuteSqlRawAsync(string sql, params object[] parameters);
}
