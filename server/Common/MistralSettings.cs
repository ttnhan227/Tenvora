namespace VeriSpend.Api.Common;

public sealed class MistralSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://api.mistral.ai/v1/chat/completions";
    public string Model { get; set; } = "pixtral-large-latest";
    public string ChatModel { get; set; } = "mistral-small-latest";
}

public sealed class AiProviderSettings
{
    public string Name { get; set; } = "Mistral";
    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://api.mistral.ai/v1/chat/completions";
    public string VisionModel { get; set; } = "mistral-small-latest";
    public string ChatModel { get; set; } = "mistral-small-latest";
}
