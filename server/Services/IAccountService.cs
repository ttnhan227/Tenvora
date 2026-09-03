using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAccountService
{
    Task<AccountResponse?> GetAccountByIdAsync(Guid tenantId, Guid accountId);
    Task<List<AccountResponse>> GetAccountsAsync(Guid tenantId, Guid? customerId = null);
    Task<AccountResponse> CreateAccountAsync(Guid tenantId, CreateAccountRequest request);
    Task<CustomerResponse> CreateCustomerAsync(Guid tenantId, CreateCustomerRequest request);
    Task<List<CustomerResponse>> GetCustomersAsync(Guid tenantId);
}
