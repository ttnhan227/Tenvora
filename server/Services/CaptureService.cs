using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;
using Tenvora.Api.Dtos;
using Tenvora.Api.Localization;
using Tenvora.Api.Models;

namespace Tenvora.Api.Services;

public sealed class CaptureService : ICaptureService
{
    private readonly AppDbContext _db;
    private readonly IObjectStorageService _storage;
    private readonly IAiActionService _actionService;
    private readonly IAppLocalizer _localizer;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CaptureService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public CaptureService(
        AppDbContext db,
        IObjectStorageService storage,
        IAiActionService actionService,
        IAppLocalizer localizer,
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<CaptureService> logger)
    {
        _db = db;
        _storage = storage;
        _actionService = actionService;
        _localizer = localizer;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ApiResult<CaptureResultDto>> AnalyzeAndStageAsync(
        Guid tenantId,
        Guid userId,
        AnalyzeDocumentRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default)
    {
        if (userRole is not ("TenantAdmin" or "OperationsManager"))
            return ApiResult<CaptureResultDto>.Fail(_localizer.GetString("error.unauthorized_action"));

        var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        if (tenant == null)
            return ApiResult<CaptureResultDto>.Fail(_localizer.GetString("error.workspace_not_found"));

        var baseCurrency = tenant.BaseCurrency ?? "VND";
        string? storedImageUrl = null;
        string? fileHash = null;
        string rawText = request.RawText?.Trim() ?? "";
        string sourceType = "text";

        // 1. Process uploaded document if provided
        if (!string.IsNullOrWhiteSpace(request.DataUrl))
        {
            sourceType = request.DataUrl.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "image";
            try
            {
                var uploadResult = await _storage.UploadDataUrlAsync(request.DataUrl, $"tenvora/{tenantId}/invoices", null, ct);
                storedImageUrl = uploadResult.Url;
                fileHash = uploadResult.FileHash;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to upload invoice image to storage. Proceeding with raw data.");
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.FileUrl))
        {
            storedImageUrl = request.FileUrl;
            sourceType = request.FileUrl.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "image";
        }

        // 2. Structured Extraction Pipeline (AI provider or heuristic fallback)
        var rawExtracted = await ExtractStructuredDataAsync(tenantId, baseCurrency, rawText, request.DataUrl, storedImageUrl, ct);

        // 3. Validation & Business Invariants
        var validationErrors = new List<string>();
        var validationWarnings = new List<string>();

        if (rawExtracted.TotalAmount <= 0)
        {
            validationErrors.Add("Total amount must be greater than zero.");
        }

        // Check line items sum vs total
        if (rawExtracted.LineItems.Count > 0)
        {
            var lineItemsSum = rawExtracted.LineItems.Sum(i => i.LineTotal);
            var expectedTotalWithTax = lineItemsSum + rawExtracted.TaxAmount;
            var diff = Math.Abs(lineItemsSum - rawExtracted.TotalAmount);
            var diffWithTax = Math.Abs(expectedTotalWithTax - rawExtracted.TotalAmount);

            // Allow tolerance of 1000 VND / $1 or match with tax
            if (diff > 1000 && diffWithTax > 1000 && lineItemsSum != rawExtracted.TotalAmount)
            {
                validationWarnings.Add($"Line items sum ({lineItemsSum:N0} {baseCurrency}) differs from total ({rawExtracted.TotalAmount:N0} {baseCurrency}). Please review amounts.");
            }
        }

        // Sane dates check
        var docDate = rawExtracted.Date ?? DateTime.UtcNow;
        if (docDate > DateTime.UtcNow.AddDays(7))
            validationWarnings.Add("Invoice date is in the future. Please verify.");
        if (docDate < DateTime.UtcNow.AddYears(-5))
            validationWarnings.Add("Invoice date is older than 5 years. Please verify.");

        // 4. Entity Matching & Learning Loop Rules
        var matchResult = await MatchEntitiesAsync(tenantId, rawExtracted.Vendor, rawExtracted.LineItems, baseCurrency, ct);

        // Calculate Due Date if supplier has payment terms
        var dueDate = rawExtracted.DueDate;
        if (!dueDate.HasValue && matchResult.MatchedSupplier != null && matchResult.MatchedSupplier.PaymentTermsDays.HasValue)
        {
            dueDate = docDate.AddDays(matchResult.MatchedSupplier.PaymentTermsDays.Value);
        }

        // 5. Duplicate Detection
        var duplicate = await DetectDuplicatesAsync(tenantId, matchResult.MatchedSupplier?.Id, rawExtracted.TotalAmount, docDate, fileHash, baseCurrency, ct);

        // 6. Assemble Provenance
        var provenanceFields = new Dictionary<string, CaptureProvenanceFieldDto>();
        var explanations = new Dictionary<string, string>();

        provenanceFields["vendor"] = new CaptureProvenanceFieldDto(
            matchResult.MatchedSupplier?.Name ?? rawExtracted.Vendor,
            matchResult.VendorConfidence,
            matchResult.VendorMatchSource,
            matchResult.VendorMatchWhy
        );
        explanations["vendor"] = matchResult.VendorMatchWhy;

        provenanceFields["total"] = new CaptureProvenanceFieldDto(
            rawExtracted.TotalAmount,
            0.98m,
            "ocr",
            $"Verified invoice total: {rawExtracted.TotalAmount:N0} {baseCurrency}"
        );

        if (rawExtracted.TaxAmount > 0)
        {
            provenanceFields["tax"] = new CaptureProvenanceFieldDto(
                rawExtracted.TaxAmount,
                0.92m,
                "ocr",
                $"Extracted tax/VAT: {rawExtracted.TaxAmount:N0} {baseCurrency}"
            );
        }

        if (dueDate.HasValue)
        {
            var dueWhy = matchResult.MatchedSupplier?.PaymentTermsDays.HasValue == true
                ? $"Calculated from {matchResult.MatchedSupplier.Name}'s {matchResult.MatchedSupplier.PaymentTermsDays.Value}-day terms."
                : "Extracted from invoice payment due date.";
            provenanceFields["dueDate"] = new CaptureProvenanceFieldDto(
                dueDate.Value.ToString("yyyy-MM-dd"),
                0.90m,
                matchResult.MatchedSupplier?.PaymentTermsDays.HasValue == true ? "rule" : "ocr",
                dueWhy
            );
            explanations["dueDate"] = dueWhy;
        }

        var overallConfidence = Math.Round(
            (matchResult.VendorConfidence + (rawExtracted.LineItems.Count > 0 ? matchResult.LineItems.Average(i => i.Confidence) : 0.9m) + 0.98m) / 3m,
            2, MidpointRounding.AwayFromZero);

        var provenance = new CaptureProvenanceDto(
            overallConfidence,
            sourceType,
            provenanceFields,
            explanations
        );

        var intent = (request.DocumentTypeHint == "expense" || (rawExtracted.LineItems.Count == 0 && string.IsNullOrWhiteSpace(rawExtracted.Vendor)))
            ? "expense"
            : "purchase";

        var draft = new CaptureDraftDto(
            intent,
            matchResult.MatchedSupplier?.Name ?? rawExtracted.Vendor,
            matchResult.MatchedSupplier?.Id,
            rawExtracted.Category ?? "Inventory",
            docDate,
            dueDate,
            baseCurrency,
            rawExtracted.TotalAmount,
            rawExtracted.TaxAmount,
            rawExtracted.PaidAmount,
            rawExtracted.PaymentMethod ?? "Cash",
            rawExtracted.Notes,
            storedImageUrl,
            fileHash,
            matchResult.LineItems,
            provenance,
            validationErrors,
            validationWarnings
        );

        // 7. Stage Draft into AiAction (PendingConfirmation) - ZERO production mutation!
        var purchaseItems = matchResult.LineItems.Select(i => new CreatePurchaseItemRequest(
            i.Description,
            string.IsNullOrWhiteSpace(i.Unit) ? "item" : i.Unit,
            i.Quantity,
            i.UnitCost,
            i.MatchedProductId
        )).ToList();

        var actionPayload = new AiActionService.ActionPayload(
            SupplierId: matchResult.MatchedSupplier?.Id,
            SupplierName: draft.Vendor,
            Amount: draft.TotalAmount,
            PaidAmount: draft.PaidAmount,
            PaymentMethod: draft.PaymentMethod,
            Notes: draft.Notes,
            InvoiceImageDataUrl: storedImageUrl,
            DueDate: dueDate,
            PurchasedAt: docDate,
            PurchaseItems: purchaseItems,
            Provenance: provenance
        );

        var summary = intent == "purchase"
            ? _localizer.GetProposalSummary("purchase", $"{draft.TotalAmount:N0} {baseCurrency}", draft.Vendor ?? "Supplier")
            : _localizer.GetProposalSummary("expense", $"{draft.TotalAmount:N0} {baseCurrency}", draft.Category ?? "Other");

        var stagedAction = new AiAction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Intent = intent,
            RiskLevel = "Financial",
            Status = AiActionStatuses.PendingConfirmation,
            RequiresConfirmation = true,
            SourceText = !string.IsNullOrWhiteSpace(rawText) ? rawText : (request.DataUrl != null ? "Scanned invoice document" : "Document upload"),
            PayloadJson = JsonSerializer.Serialize(actionPayload, JsonOptions),
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IdempotencyKey = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow
        };

        _db.AiActions.Add(stagedAction);
        await _db.SaveChangesAsync(ct);

        return ApiResult<CaptureResultDto>.Ok(new CaptureResultDto(
            stagedAction.Id,
            intent,
            stagedAction.Status,
            draft,
            duplicate,
            summary
        ));
    }

    public async Task<ApiResult<List<CaptureResultDto>>> GetReviewQueueAsync(
        Guid tenantId,
        CancellationToken ct = default)
    {
        var actions = await _db.AiActions.AsNoTracking()
            .Where(a => a.TenantId == tenantId &&
                        a.Status == AiActionStatuses.PendingConfirmation &&
                        (a.Intent == "purchase" || a.Intent == "expense"))
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        var baseCurrency = tenant?.BaseCurrency ?? "VND";

        var list = new List<CaptureResultDto>();
        foreach (var action in actions)
        {
            try
            {
                var payload = JsonSerializer.Deserialize<AiActionService.ActionPayload>(action.PayloadJson, JsonOptions);
                if (payload == null) continue;

                var lineItems = payload.PurchaseItems?.Select(p => new CaptureLineItemDto(
                    p.Description, p.Unit, p.Quantity, p.UnitCost, p.Quantity * p.UnitCost, p.ProductId, null, 0.9m, "staged"
                )).ToList() ?? new List<CaptureLineItemDto>();

                var draft = new CaptureDraftDto(
                    action.Intent,
                    payload.SupplierName,
                    payload.SupplierId,
                    payload.Category ?? "Inventory",
                    payload.PurchasedAt ?? action.CreatedAt,
                    payload.DueDate,
                    payload.Currency ?? baseCurrency,
                    payload.Amount,
                    0m,
                    payload.PaidAmount,
                    payload.PaymentMethod ?? "Cash",
                    payload.Notes,
                    payload.InvoiceImageDataUrl,
                    null,
                    lineItems,
                    payload.Provenance ?? new CaptureProvenanceDto(0.85m, "staged", new(), new()),
                    new(),
                    new()
                );

                var duplicate = await DetectDuplicatesAsync(
                    tenantId, payload.SupplierId, payload.Amount, payload.PurchasedAt ?? action.CreatedAt, null, baseCurrency, ct);

                var summary = action.Intent == "purchase"
                    ? _localizer.GetProposalSummary("purchase", $"{payload.Amount:N0} {baseCurrency}", payload.SupplierName ?? "Supplier")
                    : _localizer.GetProposalSummary("expense", $"{payload.Amount:N0} {baseCurrency}", payload.Category ?? "Other");

                list.Add(new CaptureResultDto(
                    action.Id,
                    action.Intent,
                    action.Status,
                    draft,
                    duplicate,
                    summary
                ));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not deserialize action payload {ActionId}", action.Id);
            }
        }

        return ApiResult<List<CaptureResultDto>>.Ok(list);
    }

    public async Task<ApiResult<BulkApproveResultDto>> BulkApproveAsync(
        Guid tenantId,
        Guid userId,
        BulkApproveCaptureRequest request,
        string userRole = "TenantAdmin",
        CancellationToken ct = default)
    {
        if (userRole is not ("TenantAdmin" or "OperationsManager"))
            return ApiResult<BulkApproveResultDto>.Fail(_localizer.GetString("error.unauthorized_execute"));

        var approved = 0;
        var failed = 0;
        var messages = new List<string>();

        foreach (var actionId in request.ActionIds)
        {
            var action = await _db.AiActions.FirstOrDefaultAsync(
                a => a.Id == actionId && a.TenantId == tenantId && a.Status == AiActionStatuses.PendingConfirmation, ct);
            if (action == null)
            {
                failed++;
                continue;
            }

            var confirmResult = await _actionService.ConfirmAsync(tenantId, userId, actionId, true, userRole, ct);
            if (confirmResult.Success)
            {
                approved++;
                messages.Add($"Approved {action.Intent} draft {actionId:N}.");
            }
            else
            {
                failed++;
                messages.Add($"Failed to approve {actionId:N}: {confirmResult.Message}");
            }
        }

        return ApiResult<BulkApproveResultDto>.Ok(new BulkApproveResultDto(
            request.ActionIds.Count,
            approved,
            failed,
            messages
        ));
    }

    public async Task<ApiResult<bool>> RejectDraftAsync(
        Guid tenantId,
        Guid userId,
        Guid actionId,
        CancellationToken ct = default)
    {
        var action = await _db.AiActions.FirstOrDefaultAsync(
            a => a.Id == actionId && a.TenantId == tenantId, ct);
        if (action == null)
            return ApiResult<bool>.Fail(_localizer.GetString("error.action_not_found"));

        action.Status = AiActionStatuses.Cancelled;
        action.RequiresConfirmation = false;
        action.CancelledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return ApiResult<bool>.Ok(true);
    }

    public async Task<ApiResult<List<TenantExtractionRuleDto>>> GetExtractionRulesAsync(
        Guid tenantId,
        CancellationToken ct = default)
    {
        var rules = await _db.TenantExtractionRules.AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        var dtos = rules.Select(r => new TenantExtractionRuleDto(
            r.Id, r.RuleType, r.RawPattern, r.NormalizedPattern, r.TargetEntityId, r.TargetName, r.CreatedAt
        )).ToList();

        return ApiResult<List<TenantExtractionRuleDto>>.Ok(dtos);
    }

    public async Task<ApiResult<TenantExtractionRuleDto>> CreateExtractionRuleAsync(
        Guid tenantId,
        CreateExtractionRuleRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.RawPattern) || string.IsNullOrWhiteSpace(request.TargetName))
            return ApiResult<TenantExtractionRuleDto>.Fail("Pattern and target name are required.");

        var normalized = SearchKey(request.RawPattern);
        var existing = await _db.TenantExtractionRules.FirstOrDefaultAsync(
            r => r.TenantId == tenantId && r.RuleType == request.RuleType && r.NormalizedPattern == normalized, ct);

        if (existing != null)
        {
            existing.TargetEntityId = request.TargetEntityId;
            existing.TargetName = request.TargetName.Trim();
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return ApiResult<TenantExtractionRuleDto>.Ok(new(
                existing.Id, existing.RuleType, existing.RawPattern, existing.NormalizedPattern, existing.TargetEntityId, existing.TargetName, existing.CreatedAt
            ));
        }

        var rule = new TenantExtractionRule
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RuleType = request.RuleType.Trim().ToLowerInvariant(),
            RawPattern = request.RawPattern.Trim(),
            NormalizedPattern = normalized,
            TargetEntityId = request.TargetEntityId,
            TargetName = request.TargetName.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.TenantExtractionRules.Add(rule);
        await _db.SaveChangesAsync(ct);

        return ApiResult<TenantExtractionRuleDto>.Ok(new(
            rule.Id, rule.RuleType, rule.RawPattern, rule.NormalizedPattern, rule.TargetEntityId, rule.TargetName, rule.CreatedAt
        ));
    }

    public async Task<ApiResult<bool>> DeleteExtractionRuleAsync(
        Guid tenantId,
        Guid ruleId,
        CancellationToken ct = default)
    {
        var rule = await _db.TenantExtractionRules.FirstOrDefaultAsync(
            r => r.TenantId == tenantId && r.Id == ruleId, ct);
        if (rule == null)
            return ApiResult<bool>.Fail("Rule not found.");

        _db.TenantExtractionRules.Remove(rule);
        await _db.SaveChangesAsync(ct);
        return ApiResult<bool>.Ok(true);
    }

    // ==========================================
    // EXTRACTION & OCR HELPER METHODS
    // ==========================================

    private sealed record RawExtractionResult(
        string? Vendor,
        DateTime? Date,
        DateTime? DueDate,
        string? Currency,
        decimal TotalAmount,
        decimal TaxAmount,
        decimal PaidAmount,
        string? PaymentMethod,
        string? Category,
        string? Notes,
        List<CaptureLineItemDto> LineItems
    );

    private async Task<RawExtractionResult> ExtractStructuredDataAsync(
        Guid tenantId,
        string baseCurrency,
        string rawText,
        string? dataUrl,
        string? storedImageUrl,
        CancellationToken ct)
    {
        // 1. If configured AI provider has an API key, attempt vision or text extraction
        var provider = AiProviderConfig.Resolve(_config);
        if (provider.HasApiKey && (!string.IsNullOrWhiteSpace(rawText) || !string.IsNullOrWhiteSpace(dataUrl)))
        {
            try
            {
                var aiResult = await TryExtractWithAiProviderAsync(provider, rawText, dataUrl, baseCurrency, ct);
                if (aiResult != null && aiResult.TotalAmount > 0)
                {
                    return aiResult;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI provider extraction failed. Falling back to deterministic invoice parser.");
            }
        }

        // 2. Deterministic Regex and Heuristic extraction (Offline / Local / Test Mode)
        return ParseTextDeterministic(rawText, baseCurrency);
    }

    private async Task<RawExtractionResult?> TryExtractWithAiProviderAsync(
        AiProviderSettings provider,
        string text,
        string? dataUrl,
        string currency,
        CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(12);

        var prompt = $@"Extract structured business invoice / receipt details from the given input.
Return ONLY a valid JSON object strictly matching this schema:
{{
  ""vendor"": ""string or null"",
  ""date"": ""YYYY-MM-DD or null"",
  ""dueDate"": ""YYYY-MM-DD or null"",
  ""currency"": ""{currency}"",
  ""totalAmount"": 0.0,
  ""taxAmount"": 0.0,
  ""paidAmount"": 0.0,
  ""paymentMethod"": ""Cash|BankTransfer|Card|Other"",
  ""category"": ""Inventory|Utilities|Rent|Supplies|Other"",
  ""notes"": ""string or null"",
  ""lineItems"": [
    {{
      ""description"": ""string"",
      ""unit"": ""item|box|kg|thùng|hộp|etc"",
      ""quantity"": 1.0,
      ""unitCost"": 0.0,
      ""lineTotal"": 0.0
    }}
  ]
}}
Do NOT output any markdown backticks, explanations, or extra text. Output raw JSON only.";

        if (provider.IsGemini)
        {
            var parts = new List<object> { new { text = $"{prompt}\n\nDocument text / invoice content:\n{text}" } };

            if (!string.IsNullOrWhiteSpace(dataUrl) && dataUrl.StartsWith("data:image/"))
            {
                var commaIdx = dataUrl.IndexOf(',');
                if (commaIdx > 0)
                {
                    var mimeType = dataUrl[5..dataUrl.IndexOf(';')];
                    var base64Data = dataUrl[(commaIdx + 1)..];
                    parts.Add(new
                    {
                        inlineData = new
                        {
                            mimeType = mimeType,
                            data = base64Data
                        }
                    });
                }
            }

            var requestBody = new
            {
                contents = new[] { new { parts = parts } },
                generationConfig = new { temperature = 0.1 }
            };

            var url = $"{provider.Endpoint.TrimEnd('/')}/{provider.Model}:generateContent";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("x-goog-api-key", provider.ApiKey);
            request.Content = JsonContent.Create(requestBody);

            using var response = await client.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
                if (json.TryGetProperty("candidates", out var cands) && cands.GetArrayLength() > 0 &&
                    cands[0].TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var pArray) && pArray.GetArrayLength() > 0 &&
                    pArray[0].TryGetProperty("text", out var textEl))
                {
                    var rawOutput = textEl.GetString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(rawOutput))
                    {
                        rawOutput = Regex.Replace(rawOutput, @"^```(?:json)?\s*", "", RegexOptions.IgnoreCase);
                        rawOutput = Regex.Replace(rawOutput, @"\s*```$", "");
                        return JsonSerializer.Deserialize<RawExtractionResult>(rawOutput, JsonOptions);
                    }
                }
            }
        }

        return null;
    }

    private static RawExtractionResult ParseTextDeterministic(string text, string currency)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new RawExtractionResult(null, DateTime.UtcNow, null, currency, 0m, 0m, 0m, "Cash", "Inventory", null, new());
        }

        var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);

        string? vendor = null;
        DateTime? docDate = null;
        DateTime? dueDate = null;
        decimal total = 0m;
        decimal tax = 0m;
        decimal paid = 0m;
        string paymentMethod = "Cash";
        var lineItems = new List<CaptureLineItemDto>();

        // 1. Natural Language single-sentence quick add:
        // "bought 20 boxes A from ABC Co 5M, paid half"
        // "mua 20 thùng nước ngọt từ cty ABC giá 5 triệu trả trước 2.5 triệu"
        var quickAddMatch = Regex.Match(text,
            @"(?:bought|mua|nhập)\s+(?<qty>\d+(?:[\.,]\d+)?)\s+(?<unit>[a-zA-Záàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]+)?\s+(?<product>.+?)\s+(?:from|từ|của)\s+(?<vendor>.+?)\s+(?:for|giá|với giá|hết)?\s*(?<total>\d+(?:[\.,]\d+)?\s*(?:m|k|triệu|nghìn|ngàn|đ|\$)?)(?:[,;\.]?\s*(?<paidinfo>(?:paid|trả|đã thanh toán|cọc).+))?$",
            RegexOptions.IgnoreCase);

        if (quickAddMatch.Success)
        {
            var qStr = quickAddMatch.Groups["qty"].Value.Replace(',', '.');
            decimal.TryParse(qStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedQty);
            if (parsedQty <= 0) parsedQty = 1m;

            var unit = quickAddMatch.Groups["unit"].Value.Trim();
            var prod = quickAddMatch.Groups["product"].Value.Trim();
            vendor = quickAddMatch.Groups["vendor"].Value.Trim();
            var totalStr = quickAddMatch.Groups["total"].Value;
            total = ParseAmountString(totalStr, currency);

            var paidInfo = quickAddMatch.Groups["paidinfo"].Value.ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(paidInfo))
            {
                if (paidInfo.Contains("half") || paidInfo.Contains("nửa") || paidInfo.Contains("50%"))
                {
                    paid = decimal.Round(total / 2m, 2, MidpointRounding.AwayFromZero);
                }
                else
                {
                    var paidMatch = Regex.Match(paidInfo, @"\b(\d+(?:[\.,]\d+)?\s*(?:m|k|triệu|nghìn|ngàn|đ|\$)?)\b");
                    if (paidMatch.Success)
                    {
                        paid = ParseAmountString(paidMatch.Groups[1].Value, currency);
                    }
                }
            }

            var unitCost = parsedQty > 0 ? decimal.Round(total / parsedQty, 2, MidpointRounding.AwayFromZero) : total;
            lineItems.Add(new CaptureLineItemDto(prod, string.IsNullOrWhiteSpace(unit) ? "item" : unit, parsedQty, unitCost, total, null, null, 0.95m, "text"));

            return new RawExtractionResult(vendor, DateTime.UtcNow, null, currency, total, 0m, paid, "Cash", "Inventory", text, lineItems);
        }

        // 2. Invoice / Receipt Document Heuristic Parser
        foreach (var line in lines)
        {
            var trimmed = line.Trim();

            // Vendor extraction
            if (vendor == null)
            {
                var vendorMatch = Regex.Match(trimmed, @"^(?:Đơn vị bán hàng|Nhà cung cấp|Công ty|Supplier|Vendor|Seller|From):\s*(.+)$", RegexOptions.IgnoreCase);
                if (vendorMatch.Success)
                {
                    vendor = vendorMatch.Groups[1].Value.Trim();
                    continue;
                }
                else if (Regex.IsMatch(trimmed, @"^(?:CÔNG TY|DOANH NGHIỆP|CỬA HÀNG|HỘ KINH DOANH|TNHH|CP|JSC)\b", RegexOptions.IgnoreCase))
                {
                    vendor = trimmed;
                    continue;
                }
            }

            // Date extraction
            if (!docDate.HasValue)
            {
                var dateViMatch = Regex.Match(trimmed, @"Ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})", RegexOptions.IgnoreCase);
                if (dateViMatch.Success &&
                    int.TryParse(dateViMatch.Groups[1].Value, out var day) &&
                    int.TryParse(dateViMatch.Groups[2].Value, out var month) &&
                    int.TryParse(dateViMatch.Groups[3].Value, out var year))
                {
                    docDate = new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc);
                    continue;
                }

                var dateSlashMatch = Regex.Match(trimmed, @"\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b");
                if (dateSlashMatch.Success &&
                    int.TryParse(dateSlashMatch.Groups[1].Value, out var d) &&
                    int.TryParse(dateSlashMatch.Groups[2].Value, out var m) &&
                    int.TryParse(dateSlashMatch.Groups[3].Value, out var y))
                {
                    // Vietnamese DD/MM/YYYY
                    if (m <= 12 && d <= 31)
                    {
                        docDate = new DateTime(y, m, d, 0, 0, 0, DateTimeKind.Utc);
                        continue;
                    }
                }
            }

            // Total extraction
            var totalMatch = Regex.Match(trimmed, @"(?:Tổng cộng|Tổng tiền thanh toán|Tổng thanh toán|Total Amount|Grand Total|Total):\s*([0-9\.,]+(?:\s*(?:đ|vnd|usd|\$))?)", RegexOptions.IgnoreCase);
            if (totalMatch.Success)
            {
                total = ParseAmountString(totalMatch.Groups[1].Value, currency);
                continue;
            }

            // Tax extraction
            var taxMatch = Regex.Match(trimmed, @"(?:Thuế GTGT|Tiền thuế GTGT|VAT|Tax)(?:\s*\(\d+%\))?:\s*([0-9\.,]+)", RegexOptions.IgnoreCase);
            if (taxMatch.Success)
            {
                tax = ParseAmountString(taxMatch.Groups[1].Value, currency);
                continue;
            }

            // Paid amount extraction
            var paidMatch = Regex.Match(trimmed, @"(?:Đã thanh toán|Tiền khách đưa|Paid|Amount Paid):\s*([0-9\.,]+)", RegexOptions.IgnoreCase);
            if (paidMatch.Success)
            {
                paid = ParseAmountString(paidMatch.Groups[1].Value, currency);
                continue;
            }

            // Line items pattern in tabular format:
            // "1. Cà phê Robusta 10 kg 75.000 750.000"
            // "Sữa tươi Vinamilk 100% 20 hộp 15000 300000"
            var itemMatch = Regex.Match(trimmed,
                @"^(?:\d+[\.\)]\s+)?(?<desc>.+?)\s+(?<qty>\d+(?:[\.,]\d+)?)\s+(?<unit>[a-zA-Záàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]+)\s+(?<cost>[\d\.,]+)\s+(?<total>[\d\.,]+)$",
                RegexOptions.IgnoreCase);

            if (itemMatch.Success)
            {
                var desc = itemMatch.Groups["desc"].Value.Trim();
                var qtyStr = itemMatch.Groups["qty"].Value.Replace(',', '.');
                decimal.TryParse(qtyStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var qty);
                if (qty <= 0) qty = 1m;

                var unit = itemMatch.Groups["unit"].Value.Trim();
                var cost = ParseAmountString(itemMatch.Groups["cost"].Value, currency);
                var lTotal = ParseAmountString(itemMatch.Groups["total"].Value, currency);

                if (!string.IsNullOrWhiteSpace(desc) && lTotal > 0)
                {
                    lineItems.Add(new CaptureLineItemDto(desc, unit, qty, cost > 0 ? cost : lTotal / qty, lTotal, null, null, 0.90m, "ocr"));
                }
            }
        }

        // If total not found explicitly but line items exist, sum line items + tax
        if (total <= 0 && lineItems.Count > 0)
        {
            total = lineItems.Sum(i => i.LineTotal) + tax;
        }

        // If vendor still null, use first line if reasonable length
        if (string.IsNullOrWhiteSpace(vendor) && lines.Length > 0 && lines[0].Length < 80)
        {
            vendor = lines[0].Trim();
        }

        return new RawExtractionResult(vendor, docDate ?? DateTime.UtcNow, dueDate, currency, total, tax, paid, paymentMethod, "Inventory", text, lineItems);
    }

    private static decimal ParseAmountString(string value, string currency)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0m;
        var trimmed = value.Trim().ToLowerInvariant();

        // Check for suffixes like 'm', 'k', 'triệu', 'nghìn'
        if (trimmed.EndsWith("m") || trimmed.EndsWith("triệu"))
        {
            var num = Regex.Replace(trimmed, @"[^\d\.,]", "").Replace(',', '.');
            return decimal.TryParse(num, NumberStyles.Number, CultureInfo.InvariantCulture, out var m) ? m * 1_000_000m : 0m;
        }
        if (trimmed.EndsWith("k") || trimmed.EndsWith("nghìn") || trimmed.EndsWith("ngàn"))
        {
            var num = Regex.Replace(trimmed, @"[^\d\.,]", "").Replace(',', '.');
            return decimal.TryParse(num, NumberStyles.Number, CultureInfo.InvariantCulture, out var k) ? k * 1_000m : 0m;
        }

        var cleaned = Regex.Replace(trimmed, @"[^\d\.,]", "");
        if (string.IsNullOrWhiteSpace(cleaned)) return 0m;

        // Vietnamese VND formatting: "1.500.000" or "1,500,000"
        if (cleaned.Contains('.') && cleaned.Contains(','))
        {
            if (cleaned.LastIndexOf(',') > cleaned.LastIndexOf('.'))
            {
                // 1.500,50 format
                cleaned = cleaned.Replace(".", "").Replace(',', '.');
            }
            else
            {
                // 1,500.50 format
                cleaned = cleaned.Replace(",", "");
            }
        }
        else if (cleaned.Contains('.'))
        {
            // If VND and looks like 1.500.000 or 150.000, treat dot as thousand separator
            if (currency == "VND" || Regex.IsMatch(cleaned, @"^\d{1,3}(?:\.\d{3})+$"))
            {
                cleaned = cleaned.Replace(".", "");
            }
        }
        else if (cleaned.Contains(','))
        {
            if (currency == "VND" || Regex.IsMatch(cleaned, @"^\d{1,3}(?:,\d{3})+$"))
            {
                cleaned = cleaned.Replace(",", "");
            }
            else
            {
                cleaned = cleaned.Replace(',', '.');
            }
        }

        return decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out var result) ? result : 0m;
    }

    // ==========================================
    // ENTITY MATCHING & RESOLUTION ENGINE
    // ==========================================

    private sealed record EntityMatchResult(
        Supplier? MatchedSupplier,
        decimal VendorConfidence,
        string VendorMatchSource,
        string VendorMatchWhy,
        List<CaptureLineItemDto> LineItems
    );

    private async Task<EntityMatchResult> MatchEntitiesAsync(
        Guid tenantId,
        string? extractedVendor,
        List<CaptureLineItemDto> rawLineItems,
        string currency,
        CancellationToken ct)
    {
        Supplier? matchedSupplier = null;
        decimal vendorConfidence = 0.5m;
        string vendorSource = "ocr";
        string vendorWhy = "Extracted from invoice text";

        if (!string.IsNullOrWhiteSpace(extractedVendor))
        {
            var normalizedVendor = SearchKey(extractedVendor);

            // 1. Check Learning Loop Rules (TenantExtractionRule)
            var rule = await _db.TenantExtractionRules.AsNoTracking()
                .FirstOrDefaultAsync(r => r.TenantId == tenantId &&
                                          r.RuleType == "vendor_alias" &&
                                          r.NormalizedPattern == normalizedVendor, ct);

            if (rule != null && rule.TargetEntityId.HasValue)
            {
                matchedSupplier = await _db.Suppliers.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == rule.TargetEntityId.Value, ct);
                if (matchedSupplier != null)
                {
                    vendorConfidence = 1.0m;
                    vendorSource = "rule";
                    vendorWhy = $"Matched via saved rule: '{rule.RawPattern}' -> '{matchedSupplier.Name}'";
                }
            }

            // 2. Fuzzy match against existing suppliers
            if (matchedSupplier == null)
            {
                var suppliers = await _db.Suppliers.AsNoTracking()
                    .Where(s => s.TenantId == tenantId && s.Status == "Active")
                    .ToListAsync(ct);

                Supplier? bestSupplier = null;
                var bestScore = 0.0m;

                foreach (var sup in suppliers)
                {
                    var score = CalculateSimilarity(normalizedVendor, SearchKey(sup.Name));
                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestSupplier = sup;
                    }
                }

                if (bestSupplier != null && bestScore >= 0.70m)
                {
                    matchedSupplier = bestSupplier;
                    vendorConfidence = bestScore >= 0.90m ? 0.95m : 0.85m;
                    vendorSource = bestScore >= 0.90m ? "exact_match" : "fuzzy_match";

                    // Check purchase history for explanation
                    var purchaseCount = await _db.Purchases.AsNoTracking()
                        .CountAsync(p => p.TenantId == tenantId && p.SupplierId == bestSupplier.Id, ct);

                    vendorWhy = purchaseCount > 0
                        ? $"Matched to '{bestSupplier.Name}' because you bought from them {purchaseCount} times."
                        : $"Fuzzy matched to supplier '{bestSupplier.Name}'.";
                }
                else
                {
                    vendorConfidence = 0.60m;
                    vendorSource = "create_new";
                    vendorWhy = $"Unknown supplier '{extractedVendor}'. Will create new supplier on confirm.";
                }
            }
        }

        // Match Line Items against Catalog Products
        var catalogProducts = await _db.Products.AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.IsActive)
            .ToListAsync(ct);

        var matchedItems = new List<CaptureLineItemDto>();
        foreach (var item in rawLineItems)
        {
            var normalizedItem = SearchKey(item.Description);
            Product? bestProduct = null;
            var bestProductScore = 0.0m;

            // Check product rules
            var prodRule = await _db.TenantExtractionRules.AsNoTracking()
                .FirstOrDefaultAsync(r => r.TenantId == tenantId &&
                                          r.RuleType == "product_alias" &&
                                          r.NormalizedPattern == normalizedItem, ct);

            if (prodRule != null && prodRule.TargetEntityId.HasValue)
            {
                bestProduct = catalogProducts.FirstOrDefault(p => p.Id == prodRule.TargetEntityId.Value);
                if (bestProduct != null) bestProductScore = 1.0m;
            }

            if (bestProduct == null)
            {
                foreach (var p in catalogProducts)
                {
                    var score = CalculateSimilarity(normalizedItem, SearchKey(p.Name));
                    if (score > bestProductScore)
                    {
                        bestProductScore = score;
                        bestProduct = p;
                    }
                }
            }

            if (bestProduct != null && bestProductScore >= 0.70m)
            {
                matchedItems.Add(item with
                {
                    Unit = !string.IsNullOrWhiteSpace(bestProduct.Unit) ? bestProduct.Unit : item.Unit,
                    MatchedProductId = bestProduct.Id,
                    MatchedProductName = bestProduct.Name,
                    Confidence = bestProductScore >= 0.90m ? 0.95m : 0.82m,
                    Source = bestProductScore >= 0.90m ? "exact_match" : "fuzzy_match",
                    Why = $"Matched to catalog product '{bestProduct.Name}'."
                });
            }
            else
            {
                matchedItems.Add(item with
                {
                    Confidence = 0.65m,
                    Source = "new_item",
                    Why = "New item not found in catalog."
                });
            }
        }

        return new EntityMatchResult(matchedSupplier, vendorConfidence, vendorSource, vendorWhy, matchedItems);
    }

    private static decimal CalculateSimilarity(string s1, string s2)
    {
        if (string.IsNullOrWhiteSpace(s1) || string.IsNullOrWhiteSpace(s2)) return 0m;
        if (s1.Equals(s2, StringComparison.OrdinalIgnoreCase)) return 1.0m;

        // Substring match
        if (s1.Contains(s2, StringComparison.OrdinalIgnoreCase) || s2.Contains(s1, StringComparison.OrdinalIgnoreCase))
        {
            var minLen = Math.Min(s1.Length, s2.Length);
            var maxLen = Math.Max(s1.Length, s2.Length);
            return 0.75m + (0.2m * ((decimal)minLen / maxLen));
        }

        // Token Jaccard overlap
        var t1 = s1.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var t2 = s2.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var intersection = t1.Intersect(t2, StringComparer.OrdinalIgnoreCase).Count();
        var union = t1.Union(t2, StringComparer.OrdinalIgnoreCase).Count();
        if (union > 0)
        {
            var jaccard = (decimal)intersection / union;
            if (jaccard >= 0.5m) return jaccard;
        }

        // Trigram similarity
        var tri1 = GetTrigrams(s1);
        var tri2 = GetTrigrams(s2);
        if (tri1.Count == 0 || tri2.Count == 0) return 0m;

        var matches = tri1.Intersect(tri2, StringComparer.OrdinalIgnoreCase).Count();
        var total = tri1.Union(tri2, StringComparer.OrdinalIgnoreCase).Count();

        return total > 0 ? (decimal)matches / total : 0m;
    }

    private static HashSet<string> GetTrigrams(string s)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (s.Length < 3) { set.Add(s); return set; }
        for (int i = 0; i <= s.Length - 3; i++)
        {
            set.Add(s.Substring(i, 3));
        }
        return set;
    }

    private static string SearchKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(char.ToLowerInvariant(character));
        }
        return Regex.Replace(builder.ToString().Replace('đ', 'd'), @"[^a-z0-9]+", " ").Trim();
    }

    // ==========================================
    // DUPLICATE DETECTION ENGINE
    // ==========================================

    private async Task<DuplicateWarningDto> DetectDuplicatesAsync(
        Guid tenantId,
        Guid? supplierId,
        decimal totalAmount,
        DateTime docDate,
        string? fileHash,
        string currency,
        CancellationToken ct)
    {
        if (totalAmount <= 0) return new DuplicateWarningDto(false);

        // 1. Check exact file hash match
        if (!string.IsNullOrWhiteSpace(fileHash))
        {
            var dupPurchaseByHash = await _db.Purchases.AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.DocumentHash == fileHash && p.Status != "Voided", ct);
            if (dupPurchaseByHash != null)
            {
                return new DuplicateWarningDto(
                    true,
                    $"Looks like a duplicate of purchase {dupPurchaseByHash.PurchaseNumber} ({dupPurchaseByHash.PurchasedAt:d}) with matching document hash.",
                    "Purchase",
                    dupPurchaseByHash.Id,
                    dupPurchaseByHash.PurchaseNumber,
                    dupPurchaseByHash.PurchasedAt,
                    dupPurchaseByHash.TotalAmount
                );
            }

            var dupExpenseByHash = await _db.BusinessExpenses.AsNoTracking()
                .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.DocumentHash == fileHash, ct);
            if (dupExpenseByHash != null)
            {
                return new DuplicateWarningDto(
                    true,
                    $"Looks like a duplicate of expense recorded on {dupExpenseByHash.ExpenseDate:d} with matching receipt document.",
                    "BusinessExpense",
                    dupExpenseByHash.Id,
                    null,
                    dupExpenseByHash.ExpenseDate,
                    dupExpenseByHash.Amount
                );
            }
        }

        // 2. Check Supplier + Total + Date (+/- 2 days)
        if (supplierId.HasValue)
        {
            var dateFrom = docDate.AddDays(-2);
            var dateTo = docDate.AddDays(2);
            var dupPurchase = await _db.Purchases.AsNoTracking()
                .Include(p => p.Supplier)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId &&
                                          p.SupplierId == supplierId.Value &&
                                          Math.Abs(p.TotalAmount - totalAmount) < 1m &&
                                          p.PurchasedAt >= dateFrom &&
                                          p.PurchasedAt <= dateTo &&
                                          p.Status != "Voided", ct);

            if (dupPurchase != null)
            {
                return new DuplicateWarningDto(
                    true,
                    $"Looks like a duplicate of purchase {dupPurchase.PurchaseNumber} on {dupPurchase.PurchasedAt:d} for {dupPurchase.TotalAmount:N0} {currency} (same supplier, amount, and date).",
                    "Purchase",
                    dupPurchase.Id,
                    dupPurchase.PurchaseNumber,
                    dupPurchase.PurchasedAt,
                    dupPurchase.TotalAmount
                );
            }
        }

        return new DuplicateWarningDto(false);
    }
}
