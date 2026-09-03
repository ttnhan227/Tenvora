using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccounts([FromQuery] Guid? customerId = null)
    {
        var tenantId = User.GetTenantId();
        var accounts = await _accountService.GetAccountsAsync(tenantId, customerId);
        return Ok(ApiResult<List<AccountResponse>>.Ok(accounts));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAccount(Guid id)
    {
        var tenantId = User.GetTenantId();
        var account = await _accountService.GetAccountByIdAsync(tenantId, id);
        if (account == null)
            return NotFound(ApiResult<AccountResponse>.Fail("Account not found."));

        return Ok(ApiResult<AccountResponse>.Ok(account));
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request)
    {
        var tenantId = User.GetTenantId();
        var account = await _accountService.CreateAccountAsync(tenantId, request);
        return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, ApiResult<AccountResponse>.Ok(account));
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers()
    {
        var tenantId = User.GetTenantId();
        var customers = await _accountService.GetCustomersAsync(tenantId);
        return Ok(ApiResult<List<CustomerResponse>>.Ok(customers));
    }

    [HttpPost("customers")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        var tenantId = User.GetTenantId();
        var customer = await _accountService.CreateCustomerAsync(tenantId, request);
        return Ok(ApiResult<CustomerResponse>.Ok(customer));
    }
}
