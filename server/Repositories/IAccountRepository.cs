using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(Guid tenantId, Guid accountId);
    Task<Account?> GetByAccountNumberAsync(Guid tenantId, string accountNumber);
    Task<List<Account>> GetAllAsync(Guid tenantId, Guid? customerId = null);
    Task<List<Account>> GetAccountsForUpdateAsync(Guid tenantId, params Guid[] accountIds);
    Task AddAsync(Account account);
    Task UpdateAsync(Account account);
}
