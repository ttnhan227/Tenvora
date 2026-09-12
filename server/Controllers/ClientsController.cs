using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tenvora.Api.Common;
using Tenvora.Api.Dtos;
using Tenvora.Api.Services;

namespace Tenvora.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly IClientService _clientService;

    public ClientsController(IClientService clientService)
    {
        _clientService = clientService;
    }

    [HttpGet]
    public async Task<IActionResult> GetClients([FromQuery] string? status = null)
    {
        var tenantId = User.GetTenantId();
        var result = await _clientService.GetClientsAsync(tenantId, status);
        return result.ToActionResult();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetClientById(Guid id)
    {
        var tenantId = User.GetTenantId();
        var result = await _clientService.GetClientByIdAsync(tenantId, id);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> CreateClient([FromBody] CreateClientRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _clientService.CreateClientAsync(tenantId, request);
        return result.ToActionResult();
    }

    [HttpPut("{id:guid}")]
    [HttpPatch("{id:guid}")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> UpdateClient(Guid id, [FromBody] UpdateClientRequest request)
    {
        var tenantId = User.GetTenantId();
        var result = await _clientService.UpdateClientAsync(tenantId, id, request);
        return result.ToActionResult();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin,OperationsManager")]
    public async Task<IActionResult> DeleteClient(Guid id)
    {
        var tenantId = User.GetTenantId();
        var result = await _clientService.DeleteClientAsync(tenantId, id);
        return result.ToActionResult();
    }
}
