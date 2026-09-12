using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IClientService
{
    Task<ApiResult<List<ClientSummaryDto>>> GetClientsAsync(Guid tenantId, string? status = null);
    Task<ApiResult<ClientSummaryDto>> GetClientByIdAsync(Guid tenantId, Guid clientId);
    Task<ApiResult<ClientSummaryDto>> CreateClientAsync(Guid tenantId, CreateClientRequest request);
    Task<ApiResult<ClientSummaryDto>> UpdateClientAsync(Guid tenantId, Guid clientId, UpdateClientRequest request);
    Task<ApiResult<bool>> DeleteClientAsync(Guid tenantId, Guid clientId);
}
