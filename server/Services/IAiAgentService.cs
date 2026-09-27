using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAiAgentService
{
    Task<ApiResult<AiAgentChatResponse>> AgentChatAsync(
        Guid tenantId,
        Guid userId,
        AiAgentChatRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default);

    Task<ApiResult<List<AiConversationSummaryDto>>> GetConversationsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken ct = default);

    Task<ApiResult<AiConversationDetailDto>> GetConversationAsync(
        Guid tenantId,
        Guid userId,
        Guid conversationId,
        CancellationToken ct = default);

    Task<ApiResult<bool>> DeleteConversationAsync(
        Guid tenantId,
        Guid userId,
        Guid conversationId,
        CancellationToken ct = default);
}
