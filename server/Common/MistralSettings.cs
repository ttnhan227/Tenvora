namespace VeriSpend.Api.Common;

public sealed class MistralSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://api.mistral.ai/v1/chat/completions";
    public string Model { get; set; } = "pixtral-large-latest";
}
