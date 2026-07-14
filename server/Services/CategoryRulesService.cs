using System.Text.Json;
using VeriSpend.Api.Models;

namespace VeriSpend.Api.Services;

public sealed class CategoryRulesService : ICategoryRulesService
{
    private readonly ILogger<CategoryRulesService> _logger;

    public CategoryRulesService(ILogger<CategoryRulesService> logger)
    {
        _logger = logger;
    }

    public Task<string?> SuggestCategoryAsync(Tenant tenant, string merchant, string? description)
    {
        var rules = GetRulesInternal(tenant);
        var searchText = (merchant + " " + (description ?? "")).ToLowerInvariant();

        foreach (var rule in rules)
        {
            var pattern = rule.CaseSensitive ? rule.Pattern : rule.Pattern.ToLowerInvariant();
            if (searchText.Contains(pattern))
            {
                return Task.FromResult<string?>(rule.Category);
            }
        }

        return Task.FromResult<string?>(null);
    }

    public Task<List<CategoryRule>> GetRulesAsync(Tenant tenant)
    {
        var rules = GetRulesInternal(tenant);
        return Task.FromResult(rules);
    }

    public Task SaveRulesAsync(Tenant tenant, List<CategoryRule> rules)
    {
        tenant.CategoryRules = JsonSerializer.Serialize(rules);
        return Task.CompletedTask;
    }

    private static List<CategoryRule> GetRulesInternal(Tenant tenant)
    {
        if (string.IsNullOrWhiteSpace(tenant.CategoryRules))
        {
            // Return sensible defaults
            return new List<CategoryRule>
            {
                new("uber", "Travel"),
                new("lyft", "Travel"),
                new("taxi", "Travel"),
                new("airline", "Travel"),
                new("hotel", "Accommodation"),
                new("airbnb", "Accommodation"),
                new("starbucks", "Meals"),
                new("restaurant", "Meals"),
                new("dinner", "Meals"),
                new("lunch", "Meals"),
                new("breakfast", "Meals"),
                new("office depot", "Office Supplies"),
                new("amazon", "Office Supplies"),
                new("software", "Software"),
                new("azure", "Software"),
                new("aws", "Software"),
                new("training", "Training"),
                new("course", "Training")
            };
        }

        try
        {
            return JsonSerializer.Deserialize<List<CategoryRule>>(tenant.CategoryRules) ?? new List<CategoryRule>();
        }
        catch (JsonException)
        {
            // malformed JSON; return empty defaults
            return new List<CategoryRule>();
        }
    }
}
