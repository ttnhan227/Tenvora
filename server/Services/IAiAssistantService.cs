using Tenvora.Api.Common;
using Tenvora.Api.Dtos;

namespace Tenvora.Api.Services;

public interface IAiAssistantService
{
    Task<ApiResult<AiChatResponse>> ChatAsync(Guid tenantId, string message, AiUiContext? uiContext = null, CancellationToken ct = default);
    Task<ApiResult<AiParseRecordResponse>> ParseRecordAsync(Guid tenantId, string text, CancellationToken ct = default);
    Task<ApiResult<AiInterpretedAction>> InterpretActionAsync(Guid tenantId, string text, AiUiContext? uiContext = null, CancellationToken ct = default);
}
