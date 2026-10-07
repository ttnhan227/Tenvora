namespace Tenvora.Api.Services;

internal static class AiProviderSafety
{
    internal static object[] GeminiSettings => new[]
    {
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT"
    }.Select(category => new { category, threshold = "BLOCK_MEDIUM_AND_ABOVE" }).ToArray();
}
