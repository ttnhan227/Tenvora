using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Ai;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public interface IAiCopilotService
{
    Task<ApiResult<AiCopilotResponse>> AskAsync(Guid tenantId, Guid userId, string role, AiCopilotRequest request);
}

public sealed class AiCopilotService : IAiCopilotService
{
    private readonly IExpenseRepository _expenses;
    private readonly ITenantRepository _tenants;
    private readonly IHttpClientFactory _clients;
    private readonly AiProviderSettings _settings;

    public AiCopilotService(IExpenseRepository expenses, ITenantRepository tenants, IHttpClientFactory clients, AiProviderSettings settings)
    {
        _expenses = expenses; _tenants = tenants; _clients = clients; _settings = settings;
    }

    public async Task<ApiResult<AiCopilotResponse>> AskAsync(Guid tenantId, Guid userId, string role, AiCopilotRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message) || request.Message.Length > 2000)
            return ApiResult<AiCopilotResponse>.Fail("Ask a question between 1 and 2,000 characters.");
        var tenant = await _tenants.GetByIdAsync(tenantId);
        if (tenant is null) return ApiResult<AiCopilotResponse>.Fail("Workspace not found.");
        var visible = await _expenses.GetExpensesAsync(tenantId, role, userId);
        var pending = visible.Count(e => e.Status is "Pending" or "Submitted");
        var flagged = visible.Count(e => e.Flagged);
        var total = visible.Sum(e => e.BaseAmount == 0 ? e.Amount : e.BaseAmount);
        var topCategories = visible.GroupBy(e => e.Category).OrderByDescending(g => g.Sum(e => e.Amount)).Take(5).Select(g => new { category = g.Key, spend = g.Sum(e => e.Amount), count = g.Count() }).ToArray();
        var recent = visible.OrderByDescending(e => e.CreatedAt).Take(12).Select(e => new { e.Merchant, e.Amount, e.Currency, e.Category, e.Status, e.Flagged, e.FlagReason, employee = role == "Member" ? null : e.User?.Email }).ToArray();
        var context = new { company = tenant.CompanyName, role, tenant.BaseCurrency, tenant.MaxSpendLimit, tenant.PolicyNotes, tenant.AutoApprovalEnabled, tenant.AutoApprovalMaxAmount, tenant.CategoryBudgets, expenseCount = visible.Count, totalSpend = total, pending, flagged, topCategories, recent };
        var sources = new[] { "Company policy", "Authorized expenses", "Budget configuration", "Approval status", "Risk flags" };

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            return ApiResult<AiCopilotResponse>.Ok(Fallback(request.Message, context.expenseCount, pending, flagged, tenant.PolicyNotes, sources));

        var client = _clients.CreateClient("AiProviderClient");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        var messages = new List<object> { new { role = "system", content = $"You are Veri, a concise enterprise spend-control copilot. Answer only from the authorized workspace JSON. Never invent records or claim to change data. Explain what the user should do next. Workspace: {JsonSerializer.Serialize(context)}" } };
        foreach (var item in (request.History ?? []).TakeLast(6)) messages.Add(new { role = item.Role == "assistant" ? "assistant" : "user", content = item.Content[..Math.Min(item.Content.Length, 1000)] });
        messages.Add(new { role = "user", content = request.Message });
        var response = await client.PostAsJsonAsync(_settings.Endpoint, new { model = _settings.ChatModel, temperature = 0.2, max_tokens = 500, messages });
        if (!response.IsSuccessStatusCode)
        {
            var providerError = await response.Content.ReadAsStringAsync();
            Console.Error.WriteLine($"{_settings.Name} copilot failed with HTTP {(int)response.StatusCode}: {providerError[..Math.Min(providerError.Length, 500)]}");
            return ApiResult<AiCopilotResponse>.Ok(Fallback(request.Message, visible.Count, pending, flagged, tenant.PolicyNotes, sources));
        }
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var answer = document.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        return ApiResult<AiCopilotResponse>.Ok(new(answer ?? "I could not generate an answer.", Suggestions(visible.Count, pending, flagged), sources, DateTime.UtcNow));
    }

    private static AiCopilotResponse Fallback(string question, int count, int pending, int flagged, string? policy, string[] sources)
    {
        var answer = count == 0
            ? "Welcome! Your workspace has no expenses yet. Start the guided setup, define your company policy and budgets, invite a finance manager, then upload your first receipt. I will use that real data to explain risk and next actions."
            : $"I can see {count} authorized expenses: {pending} awaiting review and {flagged} flagged. {(pending > 0 ? "Start with Pending Reviews and investigate the highest-risk claim." : "There is no pending review work right now.")} Current policy: {policy ?? "No written policy has been added."}";
        return new(answer, Suggestions(count, pending, flagged), sources, DateTime.UtcNow);
    }
    private static string[] Suggestions(int count, int pending, int flagged) => count == 0
        ? ["Start guided setup", "Upload the first receipt", "How should I define an expense policy?"]
        : pending > 0 ? ["What should I review first?", "Explain our flagged expenses", "How can we improve automation?"]
        : ["Summarize company spend", "Show budget risks", "Review our current policy"];
}
