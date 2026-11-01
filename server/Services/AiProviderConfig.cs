using System;
using Microsoft.Extensions.Configuration;

namespace Tenvora.Api.Services;

public enum AiProviderType
{
    Gemini,
    OpenAi,
    Mistral,
    Ollama,
    Custom
}

public sealed record AiProviderSettings(
    AiProviderType ProviderType,
    string? ApiKey,
    string Endpoint,
    string Model,
    string DisplayName)
{
    public bool HasApiKey => !string.IsNullOrWhiteSpace(ApiKey) || ProviderType == AiProviderType.Ollama;
    public bool IsGemini => ProviderType == AiProviderType.Gemini;
    public bool IsOpenAiCompatible => ProviderType is AiProviderType.OpenAi or AiProviderType.Mistral or AiProviderType.Ollama or AiProviderType.Custom;
}

public static class AiProviderConfig
{
    public static AiProviderSettings Resolve(IConfiguration config)
    {
        var providerStr = (config["AI_PROVIDER"] ??
                           config["AiProvider:Provider"] ??
                           Environment.GetEnvironmentVariable("AI_PROVIDER") ??
                           "").Trim().ToLowerInvariant();

        var apiKey = config["AI_PROVIDER_API_KEY"] ??
                     config["AiProvider:ApiKey"] ??
                     Environment.GetEnvironmentVariable("AI_PROVIDER_API_KEY") ??
                     Environment.GetEnvironmentVariable("AiProvider__ApiKey");

        var model = config["AI_CHAT_MODEL"] ??
                    config["AiProvider:ChatModel"] ??
                    Environment.GetEnvironmentVariable("AI_CHAT_MODEL") ??
                    Environment.GetEnvironmentVariable("AiProvider__ChatModel");

        var endpoint = config["AI_PROVIDER_ENDPOINT"] ??
                       config["AiProvider:Endpoint"] ??
                       Environment.GetEnvironmentVariable("AI_PROVIDER_ENDPOINT") ??
                       Environment.GetEnvironmentVariable("AiProvider__Endpoint");

        AiProviderType type;
        if (!string.IsNullOrWhiteSpace(providerStr))
        {
            type = providerStr switch
            {
                "openai" => AiProviderType.OpenAi,
                "mistral" => AiProviderType.Mistral,
                "ollama" => AiProviderType.Ollama,
                "custom" => AiProviderType.Custom,
                _ => AiProviderType.Gemini
            };
        }
        else if (apiKey != null && (apiKey.StartsWith("sk-proj-") || apiKey.StartsWith("sk-")))
        {
            type = AiProviderType.OpenAi;
        }
        else if (!string.IsNullOrWhiteSpace(config["MISTRAL_API_KEY"]) ||
                 !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MISTRAL_API_KEY")))
        {
            type = AiProviderType.Mistral;
            apiKey ??= config["MISTRAL_API_KEY"] ?? Environment.GetEnvironmentVariable("MISTRAL_API_KEY");
        }
        else
        {
            type = AiProviderType.Gemini;
        }

        switch (type)
        {
            case AiProviderType.OpenAi:
                endpoint = string.IsNullOrWhiteSpace(endpoint) ? "https://api.openai.com/v1" : endpoint;
                model = string.IsNullOrWhiteSpace(model) ? "gpt-4o-mini" : model;
                return new AiProviderSettings(type, apiKey, endpoint, model, "OpenAI");

            case AiProviderType.Mistral:
                endpoint = string.IsNullOrWhiteSpace(endpoint) ? "https://api.mistral.ai/v1" : endpoint;
                model = string.IsNullOrWhiteSpace(model) ? "ministral-8b-latest" : model;
                return new AiProviderSettings(type, apiKey, endpoint, model, "Mistral AI");

            case AiProviderType.Ollama:
                endpoint = string.IsNullOrWhiteSpace(endpoint) ? "http://localhost:11434/v1" : endpoint;
                model = string.IsNullOrWhiteSpace(model) ? "llama3.2" : model;
                return new AiProviderSettings(type, apiKey, endpoint, model, "Ollama");

            case AiProviderType.Custom:
                endpoint = string.IsNullOrWhiteSpace(endpoint) ? "http://localhost:8000/v1" : endpoint;
                model = string.IsNullOrWhiteSpace(model) ? "default" : model;
                return new AiProviderSettings(type, apiKey, endpoint, model, "Custom AI Provider");

            case AiProviderType.Gemini:
            default:
                endpoint = string.IsNullOrWhiteSpace(endpoint) ? "https://generativelanguage.googleapis.com/v1beta/models" : endpoint;
                model = string.IsNullOrWhiteSpace(model) ? "gemini-1.5-flash" : model;
                return new AiProviderSettings(type, apiKey, endpoint, model, "Google Gemini");
        }
    }
}
