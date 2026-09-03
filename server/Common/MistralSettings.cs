namespace Tenvora.Api.Common;

public class MistralSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://api.mistral.ai/v1/chat/completions";
    public string Model { get; set; } = "mistral-small-latest";
}
