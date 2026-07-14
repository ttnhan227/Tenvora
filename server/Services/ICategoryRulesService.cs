using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public interface ICategoryRulesService
{
    Task<string?> SuggestCategoryAsync(Tenant tenant, string merchant, string? description);
    Task<List<CategoryRule>> GetRulesAsync(Tenant tenant);
    Task SaveRulesAsync(Tenant tenant, List<CategoryRule> rules);
}

public sealed record CategoryRule(string Pattern, string Category, bool CaseSensitive = false);
