using Tenvora.Api.Common;

namespace Tenvora.Api.Services;

public record AiStatusDto(
    string Service,
    string Status,
    string Provider,
    bool ExternalLlmConfigured,
    string[] Capabilities
);

public record AiQueryResponseDto(
    string Response,
    string Source,
    string Provider,
    string? Model,
    string Context
);

public interface IAiService
{
    AiStatusDto GetStatus();
    Task<AiQueryResponseDto> ProcessQueryAsync(Guid tenantId, string prompt);
}
