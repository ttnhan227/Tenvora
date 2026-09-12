using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenvora.Api.Common;
using Tenvora.Api.Data;
using Tenvora.Api.Domain.Entities;

namespace Tenvora.Api.Controllers;

public record AiQueryRequest(string Prompt);

[ApiController]
[Authorize]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration? _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AiController>? _logger;

    public AiController(
        AppDbContext dbContext,
        IConfiguration? configuration = null,
        IHttpClientFactory? httpClientFactory = null,
        ILogger<AiController>? logger = null)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _httpClient = httpClientFactory?.CreateClient() ?? new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(10);
        _logger = logger;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var providerName = _configuration?["AI_PROVIDER_NAME"] ?? "Mistral";
        var hasKey = !string.IsNullOrWhiteSpace(_configuration?["AI_PROVIDER_API_KEY"]);

        return Ok(ApiResult<object>.Ok(new
        {
            Service = "Tenvora Freelance Financial Copilot",
            Status = "Operational",
            Provider = hasKey ? providerName : "Local Financial Engine",
            ExternalLlmConfigured = hasKey,
            Capabilities = new[]
            {
                "TaxAdvisory",
                "CashFlowForecast",
                "ClientPaymentAnalytics",
                "InvoiceStatus",
                "ExpenseAffordability"
            }
        }));
    }

    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] AiQueryRequest request)
    {
        var tenantId = User.GetTenantId();
        var rawPrompt = request.Prompt?.Trim() ?? "";
        var prompt = rawPrompt.ToLowerInvariant();

        var tenant = await _dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
        var invoices = await _dbContext.Invoices.AsNoTracking().Include(i => i.Client).Where(i => i.TenantId == tenantId).ToListAsync();
        var accounts = await _dbContext.Accounts.AsNoTracking().Where(a => a.TenantId == tenantId).ToListAsync();
        var clients = await _dbContext.Clients.AsNoTracking().Include(c => c.Invoices).Where(c => c.TenantId == tenantId).ToListAsync();

        var reportingCurrency = tenant?.BaseCurrency ?? "USD";
        var reportingInvoices = invoices.Where(i => i.Currency == reportingCurrency).ToList();
        var mainWallet = accounts.FirstOrDefault(a =>
            a.Currency == reportingCurrency &&
            (a.AccountNumber.StartsWith("MAIN-") || a.AccountNumber.StartsWith("OP-")));
        var taxVault = accounts.FirstOrDefault(a =>
            a.Currency == reportingCurrency && a.AccountNumber.StartsWith("TAX-VAULT-"));
        var availableSpend = mainWallet?.CachedBalance ?? 0m;
        var taxVaultBal = taxVault?.CachedBalance ?? 0m;
        var taxRate = tenant?.DefaultTaxSetAsideRate ?? 25m;
        var ytdPaid = reportingInvoices.Where(i => i.PaidAt?.Year == DateTime.UtcNow.Year).Sum(i => i.AmountPaid);

        // Attempt external LLM call if configured
        var providerName = _configuration?["AI_PROVIDER_NAME"] ?? "Google Gemini";
        var apiKey = _configuration?["AI_PROVIDER_API_KEY"];
        var endpoint = _configuration?["AI_PROVIDER_ENDPOINT"] ?? "https://generativelanguage.googleapis.com/v1beta/models";
        var model = _configuration?["AI_CHAT_MODEL"] ?? "gemini-flash-latest";

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var llmAnswer = await CallExternalLlmAsync(
                    providerName,
                    apiKey,
                    endpoint,
                    model,
                    rawPrompt,
                    tenant?.CompanyName ?? "Freelancer",
                    availableSpend,
                    taxVaultBal,
                    taxRate,
                    ytdPaid,
                    reportingInvoices,
                    clients,
                    reportingCurrency
                );

                if (!string.IsNullOrWhiteSpace(llmAnswer))
                {
                    return Ok(ApiResult<object>.Ok(new
                    {
                        response = llmAnswer,
                        source = "llm-provider",
                        provider = providerName,
                        model = model,
                        context = "tenant-database"
                    }));
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "External LLM call failed or rate limited. Falling back to deterministic financial engine.");
            }
        }

        // Deterministic, context-aware financial engine fallback
        var fallbackAnswer = GenerateLocalFallback(
            prompt,
            availableSpend,
            taxVaultBal,
            taxRate,
            ytdPaid,
            reportingInvoices,
            clients,
            reportingCurrency
        );

        return Ok(ApiResult<object>.Ok(new
        {
            response = fallbackAnswer,
            source = "local-financial-engine",
            provider = "Tenvora Engine",
            context = "tenant-database"
        }));
    }

    private async Task<string?> CallExternalLlmAsync(
        string providerName,
        string apiKey,
        string endpoint,
        string model,
        string userPrompt,
        string businessName,
        decimal availableSpend,
        decimal taxVaultBal,
        decimal taxRate,
        decimal ytdPaid,
        List<Invoice> invoices,
        List<Client> clients,
        string currency)
    {
        var openInvoices = invoices.Where(i => i.Status != "Paid").ToList();
        var slowest = clients.OrderByDescending(c => c.DefaultPaymentTermsDays).FirstOrDefault();
        var systemContext = $@"You are Tenvora Copilot, a concise cash-flow assistant for freelancers and independent professionals.
You have access to records in the user's Tenvora workspace:
- Business/Workspace: {businessName}
- Reporting Currency: {currency}
- Estimated Safe-to-Spend Record: {availableSpend:N2} {currency} (recorded operating balance after internal planning allocations)
- Recorded Tax Reserve: {taxVaultBal:N2} {currency} (a planning category, not money held by Tenvora)
- Tax Reserve Planning Rule: {taxRate:0.#}% of confirmed client income
- Confirmed Client Income YTD: {ytdPaid:N2} {currency}
- Open/Unpaid Invoices: {openInvoices.Count} invoice(s) with {openInvoices.Sum(i => Math.Max(0m, i.TotalAmount - i.AmountPaid)):N2} {currency} remaining
- Clients: {clients.Count} active client(s) (Slowest: {slowest?.Name ?? "None"} with Net {slowest?.DefaultPaymentTermsDays ?? 14} days)

Instructions:
1. Answer the user's question directly, clearly, and concisely in 2-4 sentences.
2. Use the workspace numbers above and call them recorded or estimated, never bank balances.
3. Keep the tone friendly, reassuring, and professional.
4. Never claim Tenvora holds, moves, protects, or sees real bank money. Tenvora has no bank connection in this build.
5. For affordability, explain that the estimate excludes unrecorded expenses and must be checked against the user's real bank balance.
6. Tax figures are planning estimates, not tax advice.";

        bool isGemini = providerName.Contains("Gemini", StringComparison.OrdinalIgnoreCase) ||
                        endpoint.Contains("googleapis.com", StringComparison.OrdinalIgnoreCase);

        if (isGemini)
        {
            return await CallGeminiAsync(apiKey, endpoint, model, userPrompt, systemContext);
        }
        else
        {
            return await CallOpenAiCompatibleAsync(apiKey, endpoint, model, userPrompt, systemContext);
        }
    }

    private async Task<string?> CallGeminiAsync(string apiKey, string endpoint, string model, string userPrompt, string systemContext)
    {
        var modelsToTry = new List<string> { model };
        if (model != "gemini-3.6-flash")
        {
            modelsToTry.Add("gemini-3.6-flash");
        }

        foreach (var m in modelsToTry)
        {
            try
            {
                var cleanEndpoint = endpoint.TrimEnd('/');
                var url = $"{cleanEndpoint}/{m}:generateContent?key={apiKey}";

                var requestBody = new
                {
                    system_instruction = new
                    {
                        parts = new[] { new { text = systemContext } }
                    },
                    contents = new[]
                    {
                        new
                        {
                            role = "user",
                            parts = new[] { new { text = userPrompt } }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.3,
                        maxOutputTokens = 1000
                    }
                };

                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
                httpRequest.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

                using var response = await _httpClient.SendAsync(httpRequest);
                if (!response.IsSuccessStatusCode)
                {
                    _logger?.LogWarning("Gemini API for model {Model} returned status code {StatusCode}", m, response.StatusCode);
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0 &&
                    candidates[0].TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts))
                {
                    var textParts = new List<string>();
                    foreach (var part in parts.EnumerateArray())
                    {
                        if (part.TryGetProperty("text", out var textProp))
                        {
                            var t = textProp.GetString();
                            if (!string.IsNullOrWhiteSpace(t))
                            {
                                textParts.Add(t);
                            }
                        }
                    }

                    if (textParts.Count > 0)
                    {
                        return string.Join(" ", textParts).Trim();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Gemini call failed for model {Model}", m);
            }
        }

        return null;
    }

    private async Task<string?> CallOpenAiCompatibleAsync(string apiKey, string endpoint, string model, string userPrompt, string systemContext)
    {
        var requestBody = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = systemContext },
                new { role = "user", content = userPrompt }
            },
            max_tokens = 400,
            temperature = 0.3
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(httpRequest);
        if (!response.IsSuccessStatusCode)
        {
            _logger?.LogWarning("External AI API returned status code {StatusCode}", response.StatusCode);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.TryGetProperty("choices", out var choices) &&
            choices.GetArrayLength() > 0 &&
            choices[0].TryGetProperty("message", out var message) &&
            message.TryGetProperty("content", out var content))
        {
            return content.GetString()?.Trim();
        }

        return null;
    }

    private string GenerateLocalFallback(
        string prompt,
        decimal availableSpend,
        decimal taxVaultBal,
        decimal taxRate,
        decimal ytdPaid,
        List<Invoice> invoices,
        List<Client> clients,
        string currency)
    {
        // 1. Greetings & Identity
        if (Regex.IsMatch(prompt, @"\b(who\s+(are|r)\s+you|what\s+are\s+you|who\s+made\s+you|hello|hi|hey|greetings|help|what\s+can\s+you\s+do)\b", RegexOptions.IgnoreCase))
        {
            return "Hello! I am your Tenvora cash-flow assistant. I can explain the invoices, confirmed income, tax-reserve estimate, and safe-to-spend figure recorded in this workspace. Tenvora is not connected to your bank, so verify decisions against your real balance.";
        }

        // 2. Direct workspace overview for in-page AI summaries
        if (Regex.IsMatch(prompt, @"\b(summary|summarize|overview|priority|priorities|today)\b", RegexOptions.IgnoreCase))
        {
            var openInvoices = invoices.Where(i => i.Status != "Paid" && i.Currency == currency).ToList();
            var outstanding = openInvoices.Sum(i => Math.Max(0m, i.TotalAmount - i.AmountPaid));
            var overdueInvoices = openInvoices.Where(i => i.DueDate < DateTime.UtcNow).ToList();
            var estimatedReserveTarget = Math.Round(ytdPaid * (taxRate / 100m), 2);
            var reserveGap = Math.Max(0m, estimatedReserveTarget - taxVaultBal);

            var priority = overdueInvoices.Count > 0
                ? $"Follow up on {overdueInvoices.Count} overdue invoice(s) totaling {overdueInvoices.Sum(i => Math.Max(0m, i.TotalAmount - i.AmountPaid)):N2} {currency}."
                : reserveGap > 0
                    ? $"Review the tax plan because the simple income-based reserve target is {reserveGap:N2} {currency} above the recorded reserve."
                    : openInvoices.Count > 0
                        ? $"Monitor {openInvoices.Count} unpaid invoice(s) totaling {outstanding:N2} {currency}."
                        : "No overdue or unpaid invoices need immediate attention.";

            return $"**Workspace summary**\n\n- Estimated safe to spend: {availableSpend:N2} {currency}\n- Confirmed income this year: {ytdPaid:N2} {currency}\n- Recorded tax reserve: {taxVaultBal:N2} {currency}\n- Unpaid invoices: {openInvoices.Count} totaling {outstanding:N2} {currency}\n\n**Why this matters:** {priority} These figures come from the current workspace database and exclude unrecorded expenses and real bank activity.";
        }

        // 3. Slowest paying clients & Overdue invoices
        if (Regex.IsMatch(prompt, @"\b(slow|slowest|overdue|late|terms|client|clients)\b", RegexOptions.IgnoreCase))
        {
            var overdueInvoices = invoices.Where(i => i.Status != "Paid" && i.DueDate < DateTime.UtcNow).ToList();
            var slowest = clients.OrderByDescending(c => c.DefaultPaymentTermsDays).FirstOrDefault();

            var sb = new StringBuilder();
            if (slowest != null)
            {
                var clientOpen = slowest.Invoices.Where(i => i.Status != "Paid").ToList();
                var clientOpenInCurrency = clientOpen.Where(i => i.Currency == currency).ToList();
                sb.Append($"Your slowest paying client is {slowest.Name} with Net {slowest.DefaultPaymentTermsDays} terms ({clientOpenInCurrency.Count} open {currency} invoice(s) totaling {clientOpenInCurrency.Sum(i => i.TotalAmount):N2} {currency}). ");
            }
            else
            {
                sb.Append("All your clients are currently in good standing. ");
            }

            if (overdueInvoices.Count > 0)
            {
                sb.Append($"You currently have {overdueInvoices.Count} overdue {currency} invoice(s) totaling {overdueInvoices.Sum(i => i.TotalAmount):N2} {currency}: {string.Join(", ", overdueInvoices.Select(i => $"{i.InvoiceNumber} ({i.TotalAmount:N2} {currency})"))}.");
            }
            else
            {
                sb.Append("You have zero overdue invoices right now.");
            }

            return sb.ToString();
        }

        // 4. Tax / Quarterly Set-Aside / Withholding (uses word boundary \b(owe|owing)\b to avoid matching "overdue")
        if (Regex.IsMatch(prompt, @"\b(tax|taxes|quarter|quarterly|withholding|set-aside|set\s+aside|irs|owe|owing)\b", RegexOptions.IgnoreCase))
        {
            var estimatedTax = Math.Round(ytdPaid * (taxRate / 100m), 2);
            var remaining = Math.Max(0m, estimatedTax - taxVaultBal);
            if (ytdPaid == 0)
            {
                return $"Your tax-reserve planning rate is {taxRate:0.#}%. You have not recorded client income this year, so the income-based target is 0.00 {currency}; the workspace currently records {taxVaultBal:N2} {currency} in the reserve category. This is a planning estimate, not money held by Tenvora or tax advice.";
            }
            return $"Based on {ytdPaid:N2} {currency} of confirmed income this year and your {taxRate:0.#}% planning rate, the workspace estimates a {estimatedTax:N2} {currency} reserve. It records {taxVaultBal:N2} {currency} in the reserve category{(remaining > 0 ? $", leaving an estimated {remaining:N2} {currency} gap" : ", which meets this simple target")}. Verify the rate and deadlines with a qualified adviser.";
        }

        // 5. Average monthly income / earnings
        if (Regex.IsMatch(prompt, @"\b(average|income|earnings|monthly|revenue|gross|make)\b", RegexOptions.IgnoreCase))
        {
            var totalEarned = invoices.Where(i => i.AmountPaid > 0 && i.PaidAt >= DateTime.UtcNow.AddDays(-90)).Sum(i => i.AmountPaid);
            var avgMonthly = Math.Round(totalEarned / 3m, 2);
            var pending = invoices.Where(i => i.Status == "Sent" || i.Status == "Viewed").Sum(i => i.TotalAmount);
            if (totalEarned == 0)
            {
                return $"You haven't recorded paid {currency} client invoices in the last 90 days yet. You have {pending:N2} {currency} in open pending invoices awaiting payment.";
            }
            return $"Over the last 90 days, your average gross monthly freelance income is approximately {avgMonthly:N2} {currency}/mo. You currently have {pending:N2} {currency} across {invoices.Count(i => i.Status == "Sent" || i.Status == "Viewed")} open invoice(s) awaiting payment.";
        }

        // 6. Affordability / Spending / Business Expenses
        if (Regex.IsMatch(prompt, @"\b(afford|spend|spending|expense|buy|purchase|cost)\b", RegexOptions.IgnoreCase))
        {
            var match = Regex.Match(prompt, @"\$?([0-9,]+(\.[0-9]{2})?)");
            decimal targetAmount = 0m;
            if (match.Success && decimal.TryParse(match.Groups[1].Value.Replace(",", ""), out var parsed))
            {
                targetAmount = parsed;
            }

            if (targetAmount > 0)
            {
                if (availableSpend >= targetAmount)
                {
                    return $"Your recorded safe-to-spend estimate of {availableSpend:N2} {currency} covers {targetAmount:N2} {currency}, leaving {(availableSpend - targetAmount):N2} {currency} in the workspace estimate. This excludes expenses you have not recorded, so check your real bank balance before purchasing.";
                }
                else
                {
                    return $"The {targetAmount:N2} {currency} purchase is above your recorded safe-to-spend estimate of {availableSpend:N2} {currency}. The workspace also records {taxVaultBal:N2} {currency} as a tax-reserve planning allocation; check your real bank balance and obligations before deciding.";
                }
            }

            return $"Your recorded safe-to-spend estimate is {availableSpend:N2} {currency}, after a {taxVaultBal:N2} {currency} tax-reserve planning allocation. Because Tenvora cannot see unrecorded expenses or your bank balance, use this as a starting point rather than a guarantee.";
        }

        // 7. Default Fallback
        return $"Your workspace shows an estimated {availableSpend:N2} {currency} safe to spend and a {taxVaultBal:N2} {currency} recorded tax reserve using a {taxRate:0.#}% planning rule. You have {invoices.Count(i => i.Status == "Sent" || i.Status == "Viewed")} open invoice(s); verify these records against your real bank activity.";
    }
}
