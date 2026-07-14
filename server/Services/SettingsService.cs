using System.Text.Json;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Budget;
using VeriSpend.Api.Dtos.Settings;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class SettingsService : ISettingsService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IExpenseRepository _expenseRepository;
    private readonly IBudgetGuardrailService _budgetGuardrailService;

    public SettingsService(
        ITenantRepository tenantRepository,
        IExpenseRepository expenseRepository,
        IBudgetGuardrailService budgetGuardrailService)
    {
        _tenantRepository = tenantRepository;
        _expenseRepository = expenseRepository;
        _budgetGuardrailService = budgetGuardrailService;
    }

    public async Task<ApiResult<CompanySettingsResponse>> GetCompanySettingsAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<CompanySettingsResponse>.Fail("Tenant not found.");
        }

        var response = new CompanySettingsResponse(tenant.Id, tenant.CompanyName, tenant.PlanType, tenant.MaxSpendLimit, tenant.PolicyNotes);
        return ApiResult<CompanySettingsResponse>.Ok(response);
    }

    public async Task<ApiResult> UpdatePolicyAsync(Guid tenantId, UpdatePolicyRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult.Fail("Tenant not found.");
        }

        tenant.MaxSpendLimit = request.MaxSpendLimit;
        tenant.PolicyNotes = request.PolicyNotes;
        await _tenantRepository.SaveChangesAsync();

        return ApiResult.Ok();
    }

    public async Task<ApiResult<List<CategoryBudget>>> GetCategoryBudgetsAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<List<CategoryBudget>>.Fail("Tenant not found.");
        }

        var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var categorySpending = expenses
            .GroupBy(expense => expense.Category, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Sum(expense => expense.Amount), StringComparer.OrdinalIgnoreCase);
        var budgets = await _budgetGuardrailService.GetCategoryBudgetsAsync(tenant, categorySpending);

        return ApiResult<List<CategoryBudget>>.Ok(budgets);
    }

    public async Task<ApiResult> UpdateCategoryBudgetsAsync(Guid tenantId, UpdateCategoryBudgetsRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult.Fail("Tenant not found.");
        }

        var cleanedBudgets = request.Budgets
            .Where(item => !string.IsNullOrWhiteSpace(item.Key) && item.Value > 0)
            .ToDictionary(item => item.Key.Trim(), item => item.Value, StringComparer.OrdinalIgnoreCase);

        return await _budgetGuardrailService.SetCategoryBudgetsAsync(tenant, cleanedBudgets);
    }

    public async Task<ApiResult<AutoApprovalRulesResponse>> GetAutoApprovalRulesAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<AutoApprovalRulesResponse>.Fail("Tenant not found.");
        }

        var excludedCategories = string.IsNullOrWhiteSpace(tenant.AutoApprovalExcludedCategories)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(tenant.AutoApprovalExcludedCategories) ?? Array.Empty<string>();

        var response = new AutoApprovalRulesResponse(
            tenant.AutoApprovalEnabled,
            tenant.AutoApprovalMaxAmount,
            tenant.AutoApprovalMaxRiskScore,
            tenant.AutoApprovalExcludeWeekends,
            excludedCategories,
            tenant.AutoApprovalMinAgeHours
        );

        return ApiResult<AutoApprovalRulesResponse>.Ok(response);
    }

    public async Task<ApiResult> UpdateAutoApprovalRulesAsync(Guid tenantId, UpdateAutoApprovalRulesRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult.Fail("Tenant not found.");
        }

        tenant.AutoApprovalEnabled = request.Enabled;
        tenant.AutoApprovalMaxAmount = request.MaxAmount;
        tenant.AutoApprovalMaxRiskScore = request.MaxRiskScore;
        tenant.AutoApprovalExcludeWeekends = request.ExcludeWeekends;
        tenant.AutoApprovalExcludedCategories = JsonSerializer.Serialize(request.ExcludedCategories);
        tenant.AutoApprovalMinAgeHours = request.MinAgeHours;

        await _tenantRepository.SaveChangesAsync();
        return ApiResult.Ok();
    }

    public async Task<ApiResult<NotificationSettingsResponse>> GetNotificationSettingsAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<NotificationSettingsResponse>.Fail("Tenant not found.");
        }

var response = new NotificationSettingsResponse(
             tenant.EmailNotificationsEnabled,
             tenant.SlackNotificationsEnabled,
             // SECURITY: Sensitive fields (SlackWebhookUrl, SlackUserEmailMappings)
             // are excluded from API responses to prevent credential leakage.
             // Owners can still set them via the update endpoint.
             tenant.SlackChannel,
             tenant.SlackTeamId,
             tenant.ManagerEmail,
             tenant.NoReplyEmail
         );

        return ApiResult<NotificationSettingsResponse>.Ok(response);
    }

    public async Task<ApiResult> UpdateNotificationSettingsAsync(Guid tenantId, UpdateNotificationSettingsRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult.Fail("Tenant not found.");
        }

        tenant.EmailNotificationsEnabled = request.EmailNotificationsEnabled;
        tenant.SlackNotificationsEnabled = request.SlackNotificationsEnabled;
        if (request.SlackWebhookUrl is not null)
        {
            tenant.SlackWebhookUrl = string.IsNullOrWhiteSpace(request.SlackWebhookUrl) ? null : request.SlackWebhookUrl;
        }
        tenant.SlackChannel = request.SlackChannel;
        tenant.SlackTeamId = request.SlackTeamId;
        if (request.SlackUserEmailMappings is not null)
        {
            tenant.SlackUserEmailMappings = string.IsNullOrWhiteSpace(request.SlackUserEmailMappings) ? null : request.SlackUserEmailMappings;
        }
        tenant.ManagerEmail = request.ManagerEmail;
        tenant.NoReplyEmail = request.NoReplyEmail;

        await _tenantRepository.SaveChangesAsync();
        return ApiResult.Ok();
    }
}
