using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Expenses;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class ExpenseService : IExpenseService
{
    private readonly IExpenseRepository _expenseRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IRiskAssessmentService _riskAssessmentService;
    private readonly IReviewAssistantService _reviewAssistantService;
    private readonly INotificationService _notificationService;
    private readonly IUserRepository _userRepository;
    private readonly IBudgetGuardrailService _budgetGuardrailService;
    private readonly ICategoryRulesService _categoryRulesService;
    private readonly IFxRateService _fxRateService;

    public ExpenseService(
        IExpenseRepository expenseRepository,
        ITenantRepository tenantRepository,
        IAuditLogService auditLogService,
        IRiskAssessmentService riskAssessmentService,
        IReviewAssistantService reviewAssistantService,
        INotificationService notificationService,
        IUserRepository userRepository,
        IBudgetGuardrailService budgetGuardrailService,
        ICategoryRulesService categoryRulesService,
        IFxRateService fxRateService)
    {
        _expenseRepository = expenseRepository;
        _tenantRepository = tenantRepository;
        _auditLogService = auditLogService;
        _riskAssessmentService = riskAssessmentService;
        _reviewAssistantService = reviewAssistantService;
        _notificationService = notificationService;
        _userRepository = userRepository;
        _budgetGuardrailService = budgetGuardrailService;
        _categoryRulesService = categoryRulesService;
        _fxRateService = fxRateService;
    }

    public async Task<ApiResult<IEnumerable<ExpenseResponse>>> GetMyExpensesAsync(Guid tenantId, string role, Guid userId)
    {
        var expenses = await _expenseRepository.GetExpensesAsync(tenantId, role, userId);
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<IEnumerable<ExpenseResponse>>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var visibleExpenses = HasTenantWideExpenseAccess(role)
            ? tenantExpenses
            : tenantExpenses.Where(expense => expense.UserId == userId).ToList();
        var assessments = _riskAssessmentService.EvaluateExpenses(expenses, tenant.MaxSpendLimit, tenantExpenses);
        return ApiResult<IEnumerable<ExpenseResponse>>.Ok(expenses.Select(expense => ToResponse(expense, assessments[expense.Id], visibleExpenses)));
    }

    public async Task<ApiResult<ExpenseResponse>> GetExpenseAsync(Guid id, Guid tenantId, string role, Guid userId)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Expense not found.");
        }

        if (!HasTenantWideExpenseAccess(role) && expense.UserId != userId)
        {
            return ApiResult<ExpenseResponse>.Fail("Forbidden");
        }

        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var visibleExpenses = HasTenantWideExpenseAccess(role)
            ? tenantExpenses
            : tenantExpenses.Where(candidate => candidate.UserId == userId).ToList();
        var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, tenantExpenses);

        return ApiResult<ExpenseResponse>.Ok(ToResponse(expense, assessment, visibleExpenses));
    }

    public async Task<ApiResult<ExpenseResponse>> CreateExpenseAsync(Guid tenantId, Guid userId, string performedBy, ExpenseCreateRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Tenant context is missing.");
        }

        var baseAmount = await _fxRateService.ConvertAsync(request.Amount, request.Currency, tenant.BaseCurrency);

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            Amount = request.Amount,
            BaseAmount = baseAmount,
            Currency = request.Currency,
            Merchant = request.Merchant,
            Category = request.Category,
            Description = request.Description,
            Status = ExpenseStatuses.Draft,
            Date = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc),
            IsDeleted = false,
            TenantId = tenantId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        // Auto-categorization: if Category is empty/Uncategorized, try rules engine
        if (string.IsNullOrWhiteSpace(expense.Category) || expense.Category.Equals("Uncategorized", StringComparison.OrdinalIgnoreCase))
        {
            var suggested = await _categoryRulesService.SuggestCategoryAsync(tenant, expense.Merchant, expense.Description);
            if (suggested != null)
            {
                expense.Category = suggested;
            }
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, [ ..tenantExpenses, expense ]);
        expense.Flagged = assessment.PolicyTriggers.Length > 0;
        expense.FlagReason = assessment.PolicyTriggers.Length > 0 ? string.Join(" ", assessment.PolicyTriggers) : null;

        await _expenseRepository.AddAsync(expense);
        await _auditLogService.LogExpenseCreatedAsync(expense, performedBy);
        await _expenseRepository.SaveChangesAsync();

        var visibleExpenses = tenantExpenses.Where(candidate => candidate.UserId == userId).Append(expense).ToList();
        return ApiResult<ExpenseResponse>.Ok(ToResponse(expense, assessment, visibleExpenses));
    }

    public async Task<ApiResult<ExpenseResponse>> UpdateExpenseAsync(Guid id, Guid tenantId, Guid userId, string performedBy, ExpenseUpdateRequest request)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Expense not found.");
        }

        if (expense.UserId != userId)
        {
            return ApiResult<ExpenseResponse>.Fail("Forbidden");
        }

        if (!expense.Status.Equals("Draft", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResult<ExpenseResponse>.Fail("Only draft expenses may be updated.");
        }

        var before = CloneExpense(expense);

        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Tenant context is missing.");
        }

        var baseAmount = await _fxRateService.ConvertAsync(request.Amount, request.Currency, tenant.BaseCurrency);

        expense.Amount = request.Amount;
        expense.BaseAmount = baseAmount;
        expense.Currency = request.Currency;
        expense.Merchant = request.Merchant;
        expense.Category = request.Category;
        expense.Description = request.Description;
        expense.Date = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc);
        expense.UpdatedAt = DateTime.UtcNow;

        if (tenant is not null)
        {
            var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
            var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, tenantExpenses);
            expense.Flagged = assessment.PolicyTriggers.Length > 0;
            expense.FlagReason = assessment.PolicyTriggers.Length > 0 ? string.Join(" ", assessment.PolicyTriggers) : null;
            expense.Status = ExpenseStatuses.Draft;

            await _auditLogService.LogExpenseUpdatedAsync(before, expense, performedBy);
            await _expenseRepository.SaveChangesAsync();
            var visibleExpenses = tenantExpenses.Where(candidate => candidate.UserId == userId).Append(expense).ToList();
            return ApiResult<ExpenseResponse>.Ok(ToResponse(expense, assessment, visibleExpenses));
        }

        await _auditLogService.LogExpenseUpdatedAsync(before, expense, performedBy);
        await _expenseRepository.SaveChangesAsync();

        var fallbackAssessment = _riskAssessmentService.EvaluateExpense(expense, 0, [ expense ]);
        return ApiResult<ExpenseResponse>.Ok(ToResponse(expense, fallbackAssessment, [ expense ]));
    }

    public async Task<ApiResult<IEnumerable<ExpenseResponse>>> BulkUpdateExpensesAsync(Guid tenantId, Guid userId, string performedBy, IEnumerable<ExpenseBulkUpdateRequest> requests)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<IEnumerable<ExpenseResponse>>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var updatedResponses = new List<ExpenseResponse>();

        foreach (var req in requests)
        {
            var expense = await _expenseRepository.GetByIdAsync(req.Id, tenantId);
            if (expense is null)
            {
                return ApiResult<IEnumerable<ExpenseResponse>>.Fail($"Expense {req.Id} not found.");
            }

            if (expense.UserId != userId)
            {
                return ApiResult<IEnumerable<ExpenseResponse>>.Fail($"Forbidden: You do not own expense {req.Id}.");
            }

            if (!expense.Status.Equals("Draft", StringComparison.OrdinalIgnoreCase))
            {
                return ApiResult<IEnumerable<ExpenseResponse>>.Fail($"Only draft expenses may be updated. Expense {expense.Merchant} is {expense.Status}.");
            }

            var before = CloneExpense(expense);
            var baseAmount = await _fxRateService.ConvertAsync(req.Amount, req.Currency, tenant.BaseCurrency);

            expense.Amount = req.Amount;
            expense.BaseAmount = baseAmount;
            expense.Currency = req.Currency;
            expense.Merchant = req.Merchant;
            expense.Category = req.Category;
            expense.Description = req.Description;
            expense.Date = DateTime.SpecifyKind(req.Date, DateTimeKind.Utc);
            expense.UpdatedAt = DateTime.UtcNow;

            var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, tenantExpenses);
            expense.Flagged = assessment.PolicyTriggers.Length > 0;
            expense.FlagReason = assessment.PolicyTriggers.Length > 0 ? string.Join(" ", assessment.PolicyTriggers) : null;
            expense.Status = ExpenseStatuses.Draft;

            await _auditLogService.LogExpenseUpdatedAsync(before, expense, performedBy);
            
            var visibleExpenses = tenantExpenses.Where(candidate => candidate.UserId == userId).Append(expense).ToList();
            updatedResponses.Add(ToResponse(expense, assessment, visibleExpenses));
        }

        await _expenseRepository.SaveChangesAsync();
        return ApiResult<IEnumerable<ExpenseResponse>>.Ok(updatedResponses);
    }

    public async Task<ApiResult<ExpenseResponse>> SubmitExpenseAsync(Guid id, Guid tenantId, Guid userId, string role, string performedBy)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Expense not found.");
        }

        if (!HasTenantWideExpenseAccess(role) && expense.UserId != userId)
        {
            return ApiResult<ExpenseResponse>.Fail("Forbidden");
        }

        if (!expense.Status.Equals(ExpenseStatuses.Draft, StringComparison.OrdinalIgnoreCase))
        {
            return ApiResult<ExpenseResponse>.Fail("Only draft expenses may be submitted.");
        }

        expense.Status = ExpenseStatuses.Pending;
        expense.UpdatedAt = DateTime.UtcNow;

        await _auditLogService.LogExpenseSubmittedAsync(expense, performedBy);
        await _expenseRepository.SaveChangesAsync();

        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<ExpenseResponse>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, tenantExpenses);
        
        var anomalyResult = RiskAssessmentService.DetectAnomalies(expense, tenantExpenses);
        if (anomalyResult.Anomalies.Length > 0)
        {
            var employee = await _userRepository.GetByIdAsync(expense.UserId);
            for (var i = 0; i < anomalyResult.Anomalies.Length; i++)
            {
                await _notificationService.NotifyAnomalyDetectedAsync(
                    expense,
                    anomalyResult.Flags[i],
                    anomalyResult.Anomalies[i],
                    employee!
                );
            }
        }

        var budgetAlerts = await _budgetGuardrailService.CheckBudgetAlertsAsync(tenant, expense);
        if (budgetAlerts.Any(a => a.AlertType == "at_limit"))
        {
            expense.Flagged = true;
            expense.FlagReason = "Category budget limit reached";
        }

        var visibleExpenses = HasTenantWideExpenseAccess(role)
            ? tenantExpenses
            : tenantExpenses.Where(candidate => candidate.UserId == userId).Append(expense).ToList();

        return ApiResult<ExpenseResponse>.Ok(ToResponse(expense, assessment, visibleExpenses));
    }

    public async Task<ApiResult> DeleteExpenseAsync(Guid id, Guid tenantId, Guid userId, string role, string performedBy)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult.Fail("Expense not found.");
        }

        if (expense.UserId != userId && !HasTenantWideExpenseAccess(role))
        {
            return ApiResult.Fail("Forbidden");
        }

        expense.IsDeleted = true;
        expense.UpdatedAt = DateTime.UtcNow;
        await _auditLogService.LogExpenseDeletedAsync(expense, performedBy);
        await _expenseRepository.SaveChangesAsync();

        return ApiResult.Ok();
    }

    public async Task<ApiResult<ExpenseStatsResponse>> GetExpenseStatsAsync(Guid tenantId, string role, Guid userId)
    {
        var expenses = await _expenseRepository.GetExpensesAsync(tenantId, role, userId);
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<ExpenseStatsResponse>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessments = _riskAssessmentService.EvaluateExpenses(expenses, tenant.MaxSpendLimit, tenantExpenses);
        var totalSpent = expenses.Sum(e => e.Amount);
        var averageSpend = expenses.Count > 0 ? expenses.Average(e => e.Amount) : 0m;
        var expenseCount = expenses.Count;
        var pendingCount = expenses.Count(e => IsPendingReviewStatus(e.Status));
        var draftCount = expenses.Count(e => e.Status == ExpenseStatuses.Draft);
        var highRiskCount = assessments.Values.Count(assessment => assessment.RiskLevel == "High");
        var averageRiskScore = assessments.Count > 0 ? decimal.Round((decimal)assessments.Values.Average(assessment => assessment.RiskScore), 2) : 0m;
        var insights = BuildInsights(expenses);

        return ApiResult<ExpenseStatsResponse>.Ok(new ExpenseStatsResponse(totalSpent, averageSpend, expenseCount, pendingCount, draftCount, highRiskCount, averageRiskScore, 0, insights));
    }

    private ExpenseResponse ToResponse(Expense expense, RiskEvaluationResult assessment, IReadOnlyCollection<Expense> tenantExpenses)
    {
        var review = _reviewAssistantService.BuildReview(expense.Id, tenantExpenses, expense, assessment);
        var anomalyResult = RiskAssessmentService.DetectAnomalies(expense, tenantExpenses);
        var anomalies = anomalyResult.Anomalies.Select(a => new AnomalyFlagResponse(anomalyResult.Flags[Array.IndexOf(anomalyResult.Anomalies, a)], a)).ToArray();
        
        return new ExpenseResponse(
            expense.Id,
            expense.Amount,
            expense.Currency,
            expense.Merchant,
            expense.Category,
            expense.Status,
            expense.Date,
            expense.CreatedAt,
            expense.UpdatedAt,
            expense.Flagged,
            expense.FlagReason,
            expense.Description,
            expense.Receipts.Select(r => r.FileUrl).ToArray(),
            assessment.ToResponse(),
            review,
            anomalies);
    }

    private static Expense CloneExpense(Expense expense)
    {
        return new Expense
        {
            Id = expense.Id,
            Amount = expense.Amount,
            Currency = expense.Currency,
            Merchant = expense.Merchant,
            Category = expense.Category,
            Description = expense.Description,
            Status = expense.Status,
            Date = expense.Date,
            Flagged = expense.Flagged,
            FlagReason = expense.FlagReason,
            CreatedAt = expense.CreatedAt,
            UpdatedAt = expense.UpdatedAt,
            TenantId = expense.TenantId,
            UserId = expense.UserId,
        };
    }

    private static ExpenseInsightsResponse BuildInsights(IEnumerable<Expense> expenses)
    {
        var expenseList = expenses.ToList();
        var now = DateTime.UtcNow;
        var currentMonthStart = UtcDateTime.StartOfUtcMonth(now);
        var previousMonthStart = currentMonthStart.AddMonths(-1);

        var currentMonthExpenses = expenseList.Where(expense => expense.Date >= currentMonthStart).ToList();
        var previousMonthExpenses = expenseList.Where(expense => expense.Date >= previousMonthStart && expense.Date < currentMonthStart).ToList();
        var currentMonthTotal = currentMonthExpenses.Sum(expense => expense.Amount);
        var previousMonthTotal = previousMonthExpenses.Sum(expense => expense.Amount);
        var changeAmount = currentMonthTotal - previousMonthTotal;
        var changePercentage = previousMonthTotal == 0
            ? (currentMonthTotal > 0 ? 100m : 0m)
            : decimal.Round((changeAmount / previousMonthTotal) * 100m, 2);

        var topCategories = currentMonthExpenses
            .GroupBy(expense => expense.Category)
            .Select(group => new ExpenseCategoryBreakdownResponse(group.Key, group.Sum(expense => expense.Amount), group.Count()))
            .OrderByDescending(group => group.TotalSpent)
            .Take(4)
            .ToArray();

        return new ExpenseInsightsResponse(currentMonthTotal, previousMonthTotal, changeAmount, changePercentage, topCategories);
    }

    private static bool HasTenantWideExpenseAccess(string role)
    {
        return role.Equals("Owner", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Manager", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPendingReviewStatus(string status)
    {
        return status.Equals(ExpenseStatuses.Pending, StringComparison.OrdinalIgnoreCase)
            || status.Equals("Submitted", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<int> ProcessAutoApprovalsAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null || !tenant.AutoApprovalEnabled)
        {
            return 0;
        }

        var excludedCategories = string.IsNullOrWhiteSpace(tenant.AutoApprovalExcludedCategories)
            ? Array.Empty<string>()
            : System.Text.Json.JsonSerializer.Deserialize<string[]>(tenant.AutoApprovalExcludedCategories) ?? Array.Empty<string>();

        var pendingExpenses = await _expenseRepository.GetPendingExpensesAsync(tenantId);
        var minAge = DateTime.UtcNow.AddHours(-tenant.AutoApprovalMinAgeHours);

        var eligibleExpenses = pendingExpenses
            .Where(e => e.CreatedAt <= minAge)
            .Where(e => e.Amount <= tenant.AutoApprovalMaxAmount)
            .Where(e => !tenant.AutoApprovalExcludeWeekends || !IsWeekendExpense(e.Date))
            .Where(e => excludedCategories.Contains(e.Category, StringComparer.OrdinalIgnoreCase) == false)
            .ToList();

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessments = _riskAssessmentService.EvaluateExpenses(eligibleExpenses, tenant.MaxSpendLimit, tenantExpenses);

        var approvedCount = 0;
        foreach (var expense in eligibleExpenses.Where(e => assessments[e.Id].RiskScore <= tenant.AutoApprovalMaxRiskScore))
        {
            expense.Status = ExpenseStatuses.Approved;
            expense.UpdatedAt = DateTime.UtcNow;
            await _auditLogService.LogExpenseApprovedAsync(expense, "Auto-Approval System");
            approvedCount++;
        }

        if (approvedCount > 0)
        {
            await _expenseRepository.SaveChangesAsync();
        }

        return approvedCount;
    }

    private static bool IsWeekendExpense(DateTime date)
    {
        return date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
    }
}
