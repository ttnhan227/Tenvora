namespace Tenvora.Api.Models;

public sealed class AiConversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = "Cuộc trò chuyện mới";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<AiConversationMessage> Messages { get; set; } = new();
}

public sealed class AiConversationMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid ConversationId { get; set; }
    public string Role { get; set; } = "user"; // "user", "assistant", "system"
    public string Content { get; set; } = default!;
    public Guid? ActionProposalId { get; set; }
    public string? ToolCallsJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AiConversation? Conversation { get; set; }
}
