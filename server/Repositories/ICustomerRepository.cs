using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Repositories;

public interface ICustomerRepository
{
    Task<Customer?> GetByIdAsync(Guid tenantId, Guid id);
    Task<List<Customer>> GetAllAsync(Guid tenantId);
    Task AddAsync(Customer customer);
    Task UpdateAsync(Customer customer);
}
