using System.ComponentModel.DataAnnotations;

namespace Tenvora.Api.Dtos;

public record AiChatRequest(
    [Required, MaxLength(2000)] string Message,
    AiUiContext? UiContext = null
);

public record AiChatResponse(
    string Reply,
    string Provider,
    string Model,
    bool IsFallback = false
);

public record AiParseRecordRequest(
    [Required] string Text
);

public record AiItemExtraction(
    string ProductName,
    decimal Quantity = 1,
    decimal UnitPrice = 0
);

public record AiSaleExtraction(
    string? CustomerName,
    decimal TotalAmount,
    decimal PaidAmount,
    string? Description = null,
    string PaymentMethod = "Cash",
    List<AiItemExtraction>? Items = null
);

public record AiExpenseExtraction(
    string Category,
    decimal Amount,
    string? Description = null
);

public record AiPaymentExtraction(
    string CustomerName,
    decimal Amount,
    string? Notes = null
);

public record AiParseRecordResponse(
    string Intent, // "sale", "expense", "debt_payment", "unknown"
    decimal Confidence,
    string Summary,
    AiSaleExtraction? Sale = null,
    AiExpenseExtraction? Expense = null,
    AiPaymentExtraction? DebtPayment = null,
    string Provider = "Google Gemini",
    string Model = "gemini-3.8-flash",
    bool IsFallback = false
);

public record AiUiContext(
    [MaxLength(300)] string? Route = null,
    [MaxLength(50)] string? Entity = null,
    Guid? EntityId = null,
    IReadOnlyDictionary<string, string>? Filters = null
);

public record AiProposeActionRequest(
    [Required, MaxLength(2000)] string Text,
    AiUiContext? UiContext = null
);

public record AiActionCandidate(Guid Id, string Label, string? Detail = null);

public record AiActionProposalResponse(
    Guid? ActionId,
    string Intent,
    string Status,
    string RiskLevel,
    bool RequiresConfirmation,
    string Summary,
    IReadOnlyDictionary<string, string?> Details,
    IReadOnlyList<AiActionCandidate>? Candidates = null,
    DateTime? ExpiresAt = null
);

public record AiActionInputOverrides(
    string? Name = null,
    string? Phone = null,
    string? Email = null,
    string? Address = null,
    string? Unit = null,
    decimal? UnitPrice = null,
    string? Category = null,
    decimal? Amount = null,
    string? Description = null
);

public record AiConfirmActionRequest(
    bool Confirmed,
    AiActionInputOverrides? Input = null
);

public record AiActionExecutionResponse(
    Guid ActionId,
    string Status,
    string Message,
    string? RecordType = null,
    Guid? RecordId = null,
    decimal? PreviousBalance = null,
    decimal? NewBalance = null
);

/// <summary>
/// Model/rule output only. Every field is resolved and validated against tenant data
/// before it can become an AiAction proposal.
/// </summary>
public record AiInterpretedAction(
    string Intent,
    decimal Confidence,
    string? EntityName = null,
    string? CustomerName = null,
    string? SupplierName = null,
    string? ProductName = null,
    decimal Amount = 0m,
    decimal PaidAmount = 0m,
    decimal Quantity = 1m,
    decimal UnitPrice = 0m,
    string? Unit = null,
    string? Category = null,
    string? Phone = null,
    string? Email = null,
    string? Address = null,
    string? Notes = null,
    string? Currency = null,
    string? Status = null
);

public record AiAgentChatRequest(
    [Required, MaxLength(4000)] string Message,
    Guid? ConversationId = null,
    AiUiContext? UiContext = null
);

public record AiAgentToolCallInfo(
    string ToolName,
    string Summary,
    object? Result = null
);

public record AiAgentChatResponse(
    Guid ConversationId,
    Guid MessageId,
    string Reply,
    AiActionProposalResponse? Proposal = null,
    List<AiAgentToolCallInfo>? ToolCalls = null,
    string Provider = "Google Gemini",
    string Model = "gemini-3.8-flash",
    bool IsFallback = false
);

public record AiConversationSummaryDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int MessageCount,
    string? LastMessage = null
);

public record AiConversationMessageDto(
    Guid Id,
    string Role,
    string Content,
    DateTime CreatedAt,
    AiActionProposalResponse? Proposal = null,
    List<AiAgentToolCallInfo>? ToolCalls = null
);

public record AiConversationDetailDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<AiConversationMessageDto> Messages
);
