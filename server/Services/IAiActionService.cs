using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAiActionService
{
    Task<ApiResult<AiActionProposalResponse>> ProposeAsync(
        Guid tenantId,
        Guid userId,
        AiProposeActionRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default);

    Task<ApiResult<AiActionExecutionResponse>> ConfirmAsync(
        Guid tenantId,
        Guid userId,
        Guid actionId,
        bool confirmed,
        string userRole = "TenantAdmin",
        CancellationToken ct = default);
}
