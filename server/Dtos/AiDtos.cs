namespace VeriSpend.Api.Dtos.Ai;

public sealed class AiUploadRequest
{
	public IFormFile File { get; set; } = default!;
}

public sealed record AiUploadResponse(Guid TempId, decimal Amount, string Currency, string Merchant, string Category, DateTime Date, bool Flagged, string FileUrl, string Message, string? OcrRawData, string ExtractionSource, bool RequiresReview, string[] Warnings);
public sealed record AiConfirmRequest(decimal Amount, string Currency, string Merchant, string Category, DateTime Date, string FileUrl, string? Description, string? OcrRawData);
public sealed record AiUsageResponse(int ScansThisMonth, int ScansRemaining);
public sealed record AiCopilotRequest(string Message, AiCopilotMessage[]? History);
public sealed record AiCopilotMessage(string Role, string Content);
public sealed record AiCopilotResponse(string Answer, string[] SuggestedActions, string[] DataSources, DateTime GeneratedAt);
