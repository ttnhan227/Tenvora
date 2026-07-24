using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using VeriSpend.Api.Common;

namespace VeriSpend.Api.Services;

public interface IAiReceiptService
{
    Task<string> SaveReceiptFileAsync(IFormFile file);
    Task<ReceiptExtractionResult> ExtractReceiptAsync(IFormFile file, decimal maxSpendLimit);
}

public sealed record ReceiptExtractionResult(
    decimal Amount,
    string Currency,
    string Merchant,
    string Category,
    DateTime Date,
    bool Flagged,
    string Message,
    string? OcrRawData,
    string Source,
    bool RequiresReview,
    string[] Warnings);

public sealed class AiReceiptService : IAiReceiptService
{
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AiProviderSettings _providerSettings;
    private readonly ILogger<AiReceiptService> _logger;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };

    public AiReceiptService(
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory,
        AiProviderSettings providerSettings,
        ILogger<AiReceiptService> logger)
    {
        _environment = environment;
        _httpClientFactory = httpClientFactory;
        _providerSettings = providerSettings;
        _logger = logger;
    }

    public async Task<string> SaveReceiptFileAsync(IFormFile file)
    {
        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "Uploads");
        Directory.CreateDirectory(uploadsFolder);

        var cleanFileName = Path.GetFileName(file.FileName);
        var safeName = $"{Guid.NewGuid()}_{cleanFileName}";
        var filePath = Path.Combine(uploadsFolder, safeName);

        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream);

        _logger.LogInformation(
            "Receipt file saved. FileName={FileName}, SavedPath={SavedPath}, Length={Length}",
            file.FileName,
            filePath,
            file.Length);

        return $"/uploads/{safeName}";
    }

    public async Task<ReceiptExtractionResult> ExtractReceiptAsync(IFormFile file, decimal maxSpendLimit)
    {
        _logger.LogInformation(
            "Starting receipt extraction. FileName={FileName}, Length={Length}, MaxSpendLimit={MaxSpendLimit}",
            file.FileName,
            file.Length,
            maxSpendLimit);

        var bytes = await ReadFileBytesAsync(file);
        var result = await TryExtractFromMistralAsync(bytes, file.FileName, file.ContentType, maxSpendLimit);
        if (result is not null)
        {
            _logger.LogInformation(
                "Receipt extraction completed using AI. FileName={FileName}, Merchant={Merchant}, Amount={Amount}, Category={Category}, Flagged={Flagged}",
                file.FileName,
                result.Merchant,
                result.Amount,
                result.Category,
                result.Flagged);

            return result;
        }

        var fallback = GetFallbackReceipt(file, maxSpendLimit);
        _logger.LogWarning(
            "Receipt extraction fell back to heuristic parser. FileName={FileName}, Merchant={Merchant}, Amount={Amount}, Category={Category}, Flagged={Flagged}",
            file.FileName,
            fallback.Merchant,
            fallback.Amount,
            fallback.Category,
            fallback.Flagged);

        return fallback;
    }

    private static async Task<byte[]> ReadFileBytesAsync(IFormFile file)
    {
        await using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        return memoryStream.ToArray();
    }

    private async Task<ReceiptExtractionResult?> TryExtractFromMistralAsync(byte[] imageBytes, string fileName, string? contentType, decimal maxSpendLimit)
    {
        if (string.IsNullOrWhiteSpace(_providerSettings.ApiKey) || string.IsNullOrWhiteSpace(_providerSettings.Endpoint))
        {
            _logger.LogWarning("Skipping Mistral extraction because API settings are incomplete. FileName={FileName}", fileName);
            return null;
        }

        _logger.LogInformation(
            "Calling Mistral receipt extraction. FileName={FileName}, Endpoint={Endpoint}, Model={Model}",
            fileName,
            _providerSettings.Endpoint,
            _providerSettings.VisionModel);

        var client = _httpClientFactory.CreateClient("AiProviderClient");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _providerSettings.ApiKey);

        var prompt = $"Extract structured receipt data from the attached receipt and return only valid JSON with keys: Amount, Currency, Merchant, Category, Date, Message. " +
                 "Category must be exactly one of: Travel, Meals, Accommodation, Office Supplies, Software, Other. " +
                 "Use ISO-8601 date. If date is unclear, use today's date. " +
                 $"If amount exceeds {maxSpendLimit} or category implies restricted alcohol spending, mention policy risk in Message. " +
                 "Message should be a short one-sentence business description suitable for an expense description field. " +
                 "If a field is missing, infer the best possible value from the receipt and file name without extra text outside JSON.";

        var mediaType = NormalizeMediaType(contentType, fileName);
        var dataUrl = $"data:{mediaType};base64,{Convert.ToBase64String(imageBytes)}";

        var requestBody = new
        {
            model = _providerSettings.VisionModel,
            response_format = new { type = "json_object" },
            temperature = 0.1,
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = "You extract structured receipt fields and respond with JSON only."
                },
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = prompt },
                        new { type = "image_url", image_url = dataUrl }
                    }
                }
            }
        };

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync(_providerSettings.Endpoint, requestBody, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mistral receipt extraction request failed. FileName={FileName}", fileName);
            return null;
        }

        if (!response.IsSuccessStatusCode)
        {
            var providerError = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "Mistral receipt extraction returned non-success status. FileName={FileName}, StatusCode={StatusCode}, ProviderError={ProviderError}",
                fileName,
                (int)response.StatusCode,
                providerError[..Math.Min(providerError.Length, 500)]);
            return null;
        }

        var content = await response.Content.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(content))
        {
            _logger.LogWarning("Mistral receipt extraction returned empty content. FileName={FileName}", fileName);
            return null;
        }

        try
        {
            using var jsonDocument = JsonDocument.Parse(content);
            var outputText = ExtractOutputText(jsonDocument.RootElement);
            if (string.IsNullOrWhiteSpace(outputText))
            {
                _logger.LogWarning("Mistral receipt extraction response did not contain output text. FileName={FileName}", fileName);
                return null;
            }

            var parsed = ParseReceiptFromMistralText(outputText, fileName, maxSpendLimit, content);
            if (parsed is null)
            {
                _logger.LogWarning("Mistral receipt extraction returned text that could not be parsed into receipt JSON. FileName={FileName}", fileName);
                return null;
            }

            _logger.LogInformation("Mistral receipt extraction parsed successfully. FileName={FileName}", fileName);
            return parsed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Mistral receipt extraction response. FileName={FileName}", fileName);
            return null;
        }
    }

    private static string? ExtractOutputText(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("choices", out var choices) && choices.ValueKind == JsonValueKind.Array)
        {
            foreach (var choice in choices.EnumerateArray())
            {
                if (choice.TryGetProperty("message", out var message))
                {
                    if (message.TryGetProperty("content", out var content))
                    {
                        if (content.ValueKind == JsonValueKind.String)
                        {
                            return content.GetString();
                        }

                        if (content.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in content.EnumerateArray())
                            {
                                if (item.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "text" &&
                                    item.TryGetProperty("text", out var textProp))
                                {
                                    return textProp.GetString();
                                }
                            }
                        }
                    }
                }
            }
        }

        if (root.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.String)
        {
            return output.GetString();
        }

        return null;
    }

    private static string NormalizeMediaType(string? contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) && !contentType.Equals("application/octet-stream", StringComparison.OrdinalIgnoreCase))
        {
            return contentType;
        }

        return Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".pdf" => "application/pdf",
            _ => "image/jpeg"
        };
    }

    private static ReceiptExtractionResult? ParseReceiptFromMistralText(string text, string fileName, decimal maxSpendLimit, string rawResponse)
    {
        var json = ExtractJsonSnippet(text);
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            var warnings = new List<string>();
            var hasAmount = TryGetDecimal(root, "amount", out var a) || TryGetDecimal(root, "Amount", out a);
            var amount = hasAmount ? a : 0m;
            if (!hasAmount || amount <= 0) warnings.Add("Amount could not be read reliably.");
            var currency = TryGetString(root, "currency") ?? TryGetString(root, "Currency") ?? "";
            if (string.IsNullOrWhiteSpace(currency)) warnings.Add("Currency could not be read reliably.");
            var merchant = TryGetString(root, "merchant") ?? TryGetString(root, "Merchant") ?? "";
            if (string.IsNullOrWhiteSpace(merchant)) warnings.Add("Merchant could not be read reliably.");
            var category = TryGetString(root, "category") ?? TryGetString(root, "Category") ?? "Other";
            var parsedDate =
                TryGetDate(root, "date") ??
                TryGetDate(root, "Date") ??
                TryGetDate(root, "transactionDate") ??
                TryGetDate(root, "transaction_date") ??
                TryGetDate(root, "receiptDate") ??
                TryGetDate(root, "receipt_date") ??
                TryGetDate(root, "purchaseDate") ??
                TryGetDate(root, "purchase_date");
            if (!parsedDate.HasValue) warnings.Add("Date could not be read reliably.");
            var date = parsedDate ?? UtcDateTime.UtcDate(DateTime.UtcNow);
            var flagged = amount > maxSpendLimit || category.Contains("alcohol", StringComparison.OrdinalIgnoreCase);
            var message = TryGetString(root, "message");
            if (string.IsNullOrWhiteSpace(message) ||
                message.Equals("Receipt analysis completed successfully.", StringComparison.OrdinalIgnoreCase))
            {
                message = BuildDescription(merchant, category, amount, currency);
            }

            return new ReceiptExtractionResult(amount, currency, merchant, category, UtcDateTime.Normalize(date), flagged, message, rawResponse, "ai", warnings.Count > 0, warnings.ToArray());
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractJsonSnippet(string text)
    {
        var first = text.IndexOf('{');
        var last = text.LastIndexOf('}');
        if (first < 0 || last < first)
        {
            return null;
        }

        return text[first..(last + 1)];
    }

    private static bool TryGetString(JsonElement element, string name, out string? value)
    {
        value = null;
        if (element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.String)
        {
            value = property.GetString();
            return true;
        }

        return false;
    }

    private static string? TryGetString(JsonElement element, string name)
    {
        return TryGetString(element, name, out var value) ? value : null;
    }

    private static bool TryGetDecimal(JsonElement element, string name, out decimal value)
    {
        value = 0;
        if (!element.TryGetProperty(name, out var property))
        {
            return false;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out value))
        {
            return true;
        }

        if (property.ValueKind == JsonValueKind.String && decimal.TryParse(property.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        return false;
    }

    private static DateTime? TryGetDate(JsonElement element, string name)
    {
        if (element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.String)
        {
            var raw = property.GetString();
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var formats = new[]
            {
                "yyyy-MM-dd",
                "yyyy/MM/dd",
                "yyyy.MM.dd",
                "MM/dd/yyyy",
                "M/d/yyyy",
                "dd/MM/yyyy",
                "d/M/yyyy",
                "MM-dd-yyyy",
                "dd-MM-yyyy",
                "dd.MM.yyyy",
                "M-d-yyyy",
                "d-M-yyyy",
                "yyyy-MM-ddTHH:mm:ss",
                "yyyy-MM-ddTHH:mm:ssZ",
                "yyyy-MM-ddTHH:mm:ss.fffZ"
            };

            if (DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AllowWhiteSpaces, out var parsedExact))
            {
                return parsedExact;
            }

            if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AllowWhiteSpaces, out var parsed))
            {
                return parsed;
            }
        }

        return null;
    }

    private static string BuildDescription(string merchant, string category, decimal amount, string currency)
    {
        var safeMerchant = string.IsNullOrWhiteSpace(merchant) ? "merchant" : merchant.Trim();
        var safeCategory = string.IsNullOrWhiteSpace(category) ? "expense" : category.Trim().ToLowerInvariant();
        return $"Receipt from {safeMerchant} categorized as {safeCategory} ({amount:0.##} {currency}).";
    }

    private static ReceiptExtractionResult GetFallbackReceipt(IFormFile file, decimal maxSpendLimit)
    {
        const string merchant = "";
        const string category = "Other";
        const string currency = "";
        const decimal amount = 0m;
        var date = UtcDateTime.UtcDate(DateTime.UtcNow);
        const bool flagged = false;
        const string message = "Automatic extraction was unavailable. Enter and verify every field before creating the draft.";

        var fallbackRawData = JsonSerializer.Serialize(new
        {
            provider = "fallback",
            fileName = file.FileName,
            amount,
            currency,
            merchant,
            category,
            date,
            flagged,
            message,
        });

        return new ReceiptExtractionResult(
            amount, currency, merchant, category, date, flagged, message, fallbackRawData,
            "fallback", true,
            ["The AI provider was unavailable; these values are heuristic placeholders and must be checked."]);
    }
}
