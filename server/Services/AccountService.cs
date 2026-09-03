using Tenvora.Api.Common;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Repositories;

namespace Tenvora.Api.Services;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICustomerRepository _customerRepository;

    public AccountService(IAccountRepository accountRepository, ICustomerRepository customerRepository)
    {
        _accountRepository = accountRepository;
        _customerRepository = customerRepository;
    }

    public async Task<AccountResponse?> GetAccountByIdAsync(Guid tenantId, Guid accountId)
    {
        var account = await _accountRepository.GetByIdAsync(tenantId, accountId);
        if (account == null) return null;

        return MapAccount(account);
    }

    public async Task<List<AccountResponse>> GetAccountsAsync(Guid tenantId, Guid? customerId = null)
    {
        var accounts = await _accountRepository.GetAllAsync(tenantId, customerId);
        return accounts.Select(MapAccount).ToList();
    }

    public async Task<AccountResponse> CreateAccountAsync(Guid tenantId, CreateAccountRequest request)
    {
        var existing = await _accountRepository.GetByAccountNumberAsync(tenantId, request.AccountNumber);
        if (existing != null)
        {
            throw new InvalidOperationException($"Account number {request.AccountNumber} already exists for this organization.");
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = request.CustomerId,
            AccountNumber = request.AccountNumber.Trim(),
            AccountType = request.AccountType,
            Currency = request.Currency.ToUpperInvariant(),
            CachedBalance = request.InitialBalance,
            Status = AccountStatuses.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _accountRepository.AddAsync(account);
        var created = await _accountRepository.GetByIdAsync(tenantId, account.Id);
        return MapAccount(created ?? account);
    }

    public async Task<CustomerResponse> CreateCustomerAsync(Guid tenantId, CreateCustomerRequest request)
    {
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone,
            KycStatus = "Verified",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _customerRepository.AddAsync(customer);
        return MapCustomer(customer);
    }

    public async Task<List<CustomerResponse>> GetCustomersAsync(Guid tenantId)
    {
        var customers = await _customerRepository.GetAllAsync(tenantId);
        return customers.Select(MapCustomer).ToList();
    }

    private static AccountResponse MapAccount(Account a) => new(
        a.Id,
        a.TenantId,
        a.CustomerId,
        a.Customer?.Name,
        a.AccountNumber,
        a.AccountType,
        a.Currency,
        a.CachedBalance,
        a.Status,
        a.CreatedAt,
        a.UpdatedAt
    );

    private static CustomerResponse MapCustomer(Customer c) => new(
        c.Id,
        c.TenantId,
        c.Name,
        c.Email,
        c.Phone,
        c.KycStatus,
        c.Status,
        c.Accounts.Select(MapAccount).ToList(),
        c.CreatedAt
    );
}
