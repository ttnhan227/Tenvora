namespace Tenvora.Api.Dtos.Ai;

public record AiChatMessage(string Role, string Content);

public record AiChatRequest(
    string Prompt,
    List<AiChatMessage>? History = null
);

public record AiChatResponse(
    string Answer,
    List<string>? RelatedEntities = null
);
