using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VeriSpend.Api.Common;
using VeriSpend.Api.Data;
using VeriSpend.Api.Dtos.Manager;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class ManagerService : IManagerService
{
    private readonly IExpenseRepository _expenseRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly ITenantRepository _tenantRepository;
    private readonly IRiskAssessmentService _riskAssessmentService;
    private readonly IReviewAssistantService _reviewAssistantService;
    private readonly INotificationService _notificationService;
    private readonly IUserRepository _userRepository;
    private readonly IBudgetGuardrailService _budgetGuardrailService;
    private readonly AppDbContext _context;
    private readonly ILogger<ManagerService> _logger;

    public ManagerService(
        IExpenseRepository expenseRepository,
        IAuditLogRepository auditLogRepository,
        IAuditLogService auditLogService,
        ITenantRepository tenantRepository,
        IRiskAssessmentService riskAssessmentService,
        IReviewAssistantService reviewAssistantService,
        INotificationService notificationService,
        IUserRepository userRepository,
        IBudgetGuardrailService budgetGuardrailService,
        AppDbContext context,
        ILogger<ManagerService> logger)
    {
        _expenseRepository = expenseRepository;
        _auditLogRepository = auditLogRepository;
        _auditLogService = auditLogService;
        _tenantRepository = tenantRepository;
        _riskAssessmentService = riskAssessmentService;
        _reviewAssistantService = reviewAssistantService;
        _notificationService = notificationService;
        _userRepository = userRepository;
        _budgetGuardrailService = budgetGuardrailService;
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResult<IEnumerable<PendingExpenseResponse>>> GetPendingExpensesAsync(Guid tenantId)
    {
        var expenses = await _expenseRepository.GetPendingExpensesAsync(tenantId);
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<IEnumerable<PendingExpenseResponse>>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessments = _riskAssessmentService.EvaluateExpenses(expenses, tenant.MaxSpendLimit, tenantExpenses);
        assessments = await ApplyLearningAdjustmentsAsync(tenantId, assessments, expenses);
        var prioritized = expenses
            .OrderByDescending(expense => assessments[expense.Id].RiskScore)
            .ThenByDescending(expense => assessments[expense.Id].PolicyTriggers.Length)
            .ThenBy(expense => expense.Date)
            .ToList();

        var result = prioritized.Select((e, index) =>
        {
            var assessment = assessments[e.Id];
            return new PendingExpenseResponse(
                e.Id,
                e.User?.Email ?? "Unknown employee",
                e.Amount,
                e.Currency,
                e.Merchant,
                e.Category,
                e.Status,
                e.Date,
                e.Flagged,
                e.FlagReason,
                e.Description,
                e.Receipts.Select(r => r.FileUrl).ToArray(),
                index + 1,
                assessment.PolicyTriggers.Length,
                assessment.ToResponse(),
                _reviewAssistantService.BuildReview(e.Id, tenantExpenses, e, assessment));
        });

        return ApiResult<IEnumerable<PendingExpenseResponse>>.Ok(result);
    }

    public async Task<ApiResult<AuditInsightsResponse>> GetAuditInsightsAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<AuditInsightsResponse>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var auditLogs = await _auditLogRepository.GetTenantAuditLogsAsync(tenantId);
        var assessments = _riskAssessmentService.EvaluateExpenses(tenantExpenses, tenant.MaxSpendLimit, tenantExpenses);
        assessments = await ApplyLearningAdjustmentsAsync(tenantId, assessments, tenantExpenses);

        var approvedCount = tenantExpenses.Count(expense => expense.Status.Equals(ExpenseStatuses.Approved, StringComparison.OrdinalIgnoreCase));
        var rejectedCount = tenantExpenses.Count(expense => expense.Status.Equals(ExpenseStatuses.Rejected, StringComparison.OrdinalIgnoreCase));
        var flaggedCount = tenantExpenses.Count(expense => expense.Flagged);
        var highRiskCount = assessments.Values.Count(assessment => assessment.RiskLevel == "High");

        var topRejectionReasons = auditLogs
            .Where(log => log.Action.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
            .Select(log => ExtractReason(log.Notes))
            .Where(reason => !string.IsNullOrWhiteSpace(reason))
            .GroupBy(reason => reason!, StringComparer.OrdinalIgnoreCase)
            .Select(group => new RejectionReasonInsightResponse(group.Key, group.Count()))
            .OrderByDescending(group => group.Count)
            .Take(5)
            .ToArray();

        var highestFlaggedCategories = tenantExpenses
            .GroupBy(expense => expense.Category)
            .Select(group =>
            {
                var expenseCount = group.Count();
                var flaggedItems = group.Count(expense => expense.Flagged || assessments[expense.Id].RiskLevel == "High");
                var flagRate = expenseCount == 0 ? 0m : decimal.Round((decimal)flaggedItems / expenseCount * 100m, 2);
                return new CategoryFlagInsightResponse(group.Key, flaggedItems, expenseCount, flagRate);
            })
            .OrderByDescending(group => group.FlagRate)
            .ThenByDescending(group => group.FlaggedCount)
            .Take(5)
            .ToArray();

        var highestFlagRateEmployees = tenantExpenses
            .GroupBy(expense => expense.User?.Email ?? "Unknown employee")
            .Select(group =>
            {
                var expenseCount = group.Count();
                var flaggedItems = group.Count(expense => expense.Flagged || assessments[expense.Id].RiskLevel == "High");
                var flagRate = expenseCount == 0 ? 0m : decimal.Round((decimal)flaggedItems / expenseCount * 100m, 2);
                return new EmployeeFlagInsightResponse(group.Key, flaggedItems, expenseCount, flagRate);
            })
            .OrderByDescending(group => group.FlagRate)
            .ThenByDescending(group => group.FlaggedCount)
            .Take(5)
            .ToArray();

        var topPolicyTriggers = assessments.Values
            .SelectMany(assessment => assessment.PolicyTriggers)
            .Where(trigger => !string.IsNullOrWhiteSpace(trigger))
            .GroupBy(trigger => trigger, StringComparer.OrdinalIgnoreCase)
            .Select(group => new PolicyTriggerInsightResponse(group.Key, group.Count()))
            .OrderByDescending(group => group.Count)
            .Take(8)
            .ToArray();

        var turnaround = BuildTurnaroundInsights(auditLogs);
        var operationalKpis = BuildOperationalKpis(tenantExpenses, auditLogs, assessments);
        var learningMetrics = await BuildLearningMetricsAsync(tenantId);
        var policyRecommendations = await BuildPolicyRecommendationsAsync(tenant, tenantExpenses, assessments);
        var employeeBehaviorInsights = BuildEmployeeBehaviorInsights(tenantExpenses);
        var monthlyHighRiskTrend = BuildMonthlyHighRiskTrend(tenantExpenses, assessments);
        var monthlyPolicyTriggerTrend = BuildMonthlyPolicyTriggerTrend(tenantExpenses, assessments);

        var response = new AuditInsightsResponse(
            approvedCount,
            rejectedCount,
            flaggedCount,
            highRiskCount,
            turnaround,
            operationalKpis,
            learningMetrics,
            policyRecommendations,
            employeeBehaviorInsights,
            topRejectionReasons,
            highestFlaggedCategories,
            highestFlagRateEmployees,
            topPolicyTriggers,
            monthlyHighRiskTrend,
            monthlyPolicyTriggerTrend);

        return ApiResult<AuditInsightsResponse>.Ok(response);
    }

    public async Task<ApiResult<ApproveExpenseResponse>> ApproveAsync(Guid id, Guid tenantId, string performedBy)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult<ApproveExpenseResponse>.Fail("Expense not found.");
        }

        if (!IsPendingReviewStatus(expense.Status))
        {
            return ApiResult<ApproveExpenseResponse>.Fail("Only pending expenses may be approved.");
        }

        expense.Status = ExpenseStatuses.Approved;
        expense.UpdatedAt = DateTime.UtcNow;

        await _auditLogService.LogExpenseApprovedAsync(expense, performedBy);
        await _expenseRepository.SaveChangesAsync();

        return ApiResult<ApproveExpenseResponse>.Ok(new ApproveExpenseResponse(expense.Id, expense.Status, DateTime.UtcNow));
    }

    public async Task<ApiResult> RejectAsync(Guid id, Guid tenantId, RejectExpenseRequest request, string performedBy)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult.Fail("Expense not found.");
        }

        if (!IsPendingReviewStatus(expense.Status))
        {
            return ApiResult.Fail("Only pending expenses may be rejected.");
        }

        expense.Status = ExpenseStatuses.Rejected;
        expense.UpdatedAt = DateTime.UtcNow;

        await _auditLogService.LogExpenseRejectedAsync(expense, performedBy, request.Reason);
        await _expenseRepository.SaveChangesAsync();

        // Send rejection email notification asynchronously
        var approver = await _userRepository.GetByEmailAndTenantAsync(performedBy, tenantId);
        if (approver != null)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await _notificationService.SendExpenseRejectedAsync(expense, request.Reason, approver);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send rejection notification for expense {ExpenseId}", expense.Id);
                }
            });
        }

        return ApiResult.Ok();
    }

    public async Task<ApiResult<ReviewFeedbackResponse>> SubmitReviewFeedbackAsync(Guid id, Guid tenantId, SubmitReviewFeedbackRequest request, string performedBy)
    {
        var correctedRiskLevel = NormalizeRiskLevel(request.CorrectedRiskLevel);
        if (correctedRiskLevel is null)
        {
            return ApiResult<ReviewFeedbackResponse>.Fail("Corrected risk level must be Low, Medium, or High.");
        }

        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult<ReviewFeedbackResponse>.Fail("Expense not found.");
        }

        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<ReviewFeedbackResponse>.Fail("Tenant context is missing.");
        }

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, tenantExpenses);
        var auditLogs = await _auditLogRepository.GetByExpenseIdAsync(id);
        var wasAutoApproved = auditLogs.Any(log =>
            log.Action.Equals("Approved", StringComparison.OrdinalIgnoreCase)
            && log.PerformedBy.Equals("Auto-Approval System", StringComparison.OrdinalIgnoreCase));

        var feedback = new ExpenseReviewFeedback
        {
            Id = Guid.NewGuid(),
            ExpenseId = expense.Id,
            TenantId = tenantId,
            SubmittedBy = performedBy,
            OriginalRiskScore = assessment.RiskScore,
            OriginalRiskLevel = assessment.RiskLevel,
            CorrectedRiskLevel = correctedRiskLevel,
            WasFalsePositive = request.WasFalsePositive,
            WasAutoApproved = wasAutoApproved,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.ExpenseReviewFeedback.Add(feedback);
        await _auditLogRepository.AddAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            ExpenseId = expense.Id,
            Action = "ReviewFeedbackSubmitted",
            PerformedBy = performedBy,
            NewValue = System.Text.Json.JsonSerializer.Serialize(new
            {
                feedback.CorrectedRiskLevel,
                feedback.WasFalsePositive,
                feedback.WasAutoApproved,
                feedback.OriginalRiskScore,
                feedback.OriginalRiskLevel,
                feedback.Notes
            }),
            Notes = "Manager correction recorded for risk learning.",
            Timestamp = feedback.CreatedAt
        });
        await _context.SaveChangesAsync();

        var metrics = await BuildLearningMetricsAsync(tenantId);
        return ApiResult<ReviewFeedbackResponse>.Ok(new ReviewFeedbackResponse(feedback.Id, feedback.ExpenseId, feedback.CorrectedRiskLevel, feedback.WasFalsePositive, feedback.WasAutoApproved, metrics.CurrentConfidenceScore, feedback.CreatedAt));
    }

    public async Task<ApiResult<IEnumerable<AuditEntryResponse>>> GetAuditTrailAsync(Guid id, Guid tenantId)
    {
        var expense = await _expenseRepository.GetByIdAsync(id, tenantId);
        if (expense is null)
        {
            return ApiResult<IEnumerable<AuditEntryResponse>>.Fail("Expense not found.");
        }

        var auditEntries = await _auditLogRepository.GetByExpenseIdAsync(id);
        var result = auditEntries.Select(a => new AuditEntryResponse(a.Id, a.Action, a.PerformedBy, a.Timestamp, a.Notes, a.OldValue, a.NewValue));
        return ApiResult<IEnumerable<AuditEntryResponse>>.Ok(result);
    }

public async Task<FileContentResult> ExportTenantExpensesAsync(Guid tenantId)
     {
         var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
         var csv = new StringBuilder();
         csv.AppendLine("Id,EmployeeEmail,Amount,Currency,Merchant,Category,Status,Date,Flagged,FlagReason,Description,Receipts");

         foreach (var expense in expenses)
         {
             var receipts = string.Join("|", expense.Receipts.Select(r => r.FileUrl));
             csv.AppendLine($"{expense.Id},\"{EscapeValue(expense.User?.Email)}\",{expense.Amount},{expense.Currency},\"{EscapeValue(expense.Merchant)}\",\"{EscapeValue(expense.Category)}\",{expense.Status},{expense.Date:O},{expense.Flagged},\"{EscapeValue(expense.FlagReason)}\",\"{EscapeValue(expense.Description)}\",\"{EscapeValue(receipts)}\"");
         }

         var bytes = Encoding.UTF8.GetBytes(csv.ToString());
         return new FileContentResult(bytes, "text/csv") { FileDownloadName = $"tenant-expenses-{DateTime.UtcNow:yyyyMMdd}.csv" };
     }

     public async Task<FileContentResult> ExportToQuickBooksAsync(Guid tenantId)
     {
         var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
         var csv = new StringBuilder();

         csv.AppendLine("Date,Payee,ExpenseAccount,Description,Amount,Currency,EmployeeEmail,ExpenseId");

         foreach (var expense in expenses)
         {
             var amount = expense.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
             csv.AppendLine(string.Join(",",
                 Csv(expense.Date.ToString("yyyy-MM-dd")),
                 Csv(expense.Merchant),
                 Csv($"Expenses:{expense.Category}"),
                 Csv(expense.Description ?? expense.Category),
                 amount,
                 Csv(expense.Currency),
                 Csv(expense.User?.Email ?? "Unknown"),
                 Csv(expense.Id.ToString())));
         }

         var bytes = Encoding.UTF8.GetBytes(csv.ToString());
         return new FileContentResult(bytes, "text/csv")
         {
             FileDownloadName = $"quickbooks-export-{DateTime.UtcNow:yyyyMMdd}.csv"
         };
     }

     public async Task<FileContentResult> ExportToXeroAsync(Guid tenantId)
     {
         var expenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
         var csv = new StringBuilder();

         // Xero CSV format - simplified version of their standard format
         csv.AppendLine("Date,ContactName,ContactNumber,AccountCode,Description,Quantity,UnitAmount,Total,CurrencyCode,TaxType,TaxAmount,ExchangeRate");

          foreach (var expense in expenses)
          {
              var date = expense.Date.ToString("yyyy-MM-dd");
              var amount = expense.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
              var contactName = expense.User?.Email ?? "Unknown Employee";
              var accountCode = MapCategoryToAccountCode(expense.Category);
              var description = EscapeValue(expense.Description ?? expense.Merchant);

              csv.AppendLine(string.Join(",",
                  Csv(date),
                  Csv(contactName),
                  string.Empty,
                  Csv(accountCode),
                  Csv(description),
                  "1",
                  amount,
                  amount,
                  Csv(expense.Currency ?? "USD"),
                  "NONE",
                  "0",
                  "1"));
          }

         var bytes = Encoding.UTF8.GetBytes(csv.ToString());
         return new FileContentResult(bytes, "text/csv")
         {
             FileDownloadName = $"xero-export-{DateTime.UtcNow:yyyyMMdd}.csv"
         };
     }

      private static string MapCategoryToAccountCode(string category)
      {
          return category.ToLower() switch
          {
              "travel" => "6100",
              "meals" => "6200",
              "accommodation" => "6300",
              "office supplies" => "6400",
              "software" => "6500",
              "training" => "6600",
              _ => "6999" // Miscellaneous
          };
      }

    public async Task<ApiResult<BudgetPredictionResponse>> GetBudgetPredictionAsync(Guid tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<BudgetPredictionResponse>.Fail("Tenant not found.");
        }

        var prediction = await _budgetGuardrailService.GetBudgetPredictionAsync(tenant);
        return prediction;
    }

    private static List<(DateTime Month, decimal Value)> GetLast6MonthsOfData(IEnumerable<Expense> expenses)
     {
         var now = DateTime.UtcNow;
         return Enumerable.Range(0, 6)
             .Select(offset => new DateTime(now.Year, now.Month, 1).AddMonths(-offset))
             .Select(month =>
             {
                 var start = new DateTime(month.Year, month.Month, 1);
                 var end = start.AddMonths(1).AddDays(-1);
                 var monthData = expenses.Where(e => e.Date >= start && e.Date <= end);
                 return (start, monthData.Sum(e => e.Amount));
             })
             .OrderBy(m => m.Item1)
             .ToList();
     }

    private static string EscapeValue(string? value)
    {
        return string.IsNullOrEmpty(value) ? string.Empty : value.Replace("\"", "\"\"");
    }

    private static string Csv(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return $"\"{value.Replace("\"", "\"\"")}\"";
    }

    private static bool IsPendingReviewStatus(string status)
    {
        return status.Equals(ExpenseStatuses.Pending, StringComparison.OrdinalIgnoreCase)
            || status.Equals("Submitted", StringComparison.OrdinalIgnoreCase);
    }

    private static string? ExtractReason(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
        {
            return null;
        }

        var segments = notes.Split("|", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var reasonSegment = segments.FirstOrDefault(segment => segment.StartsWith("Reason:", StringComparison.OrdinalIgnoreCase));
        return reasonSegment?[(reasonSegment.IndexOf(':') + 1)..].Trim();
    }

    private static ReviewTurnaroundInsightResponse BuildTurnaroundInsights(IEnumerable<AuditLog> auditLogs)
    {
        var logList = auditLogs.ToList();
        var approvalHours = new List<decimal>();
        var decisionHours = new List<decimal>();

        foreach (var expenseLogGroup in logList.GroupBy(log => log.ExpenseId))
        {
            var submittedAt = expenseLogGroup
                .Where(log => log.Action.Equals("Submitted", StringComparison.OrdinalIgnoreCase))
                .OrderBy(log => log.Timestamp)
                .Select(log => (DateTime?)log.Timestamp)
                .FirstOrDefault();

            if (!submittedAt.HasValue)
            {
                continue;
            }

            var approvedAt = expenseLogGroup
                .Where(log => log.Action.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                .OrderBy(log => log.Timestamp)
                .Select(log => (DateTime?)log.Timestamp)
                .FirstOrDefault();

            var decidedAt = expenseLogGroup
                .Where(log => log.Action.Equals("Approved", StringComparison.OrdinalIgnoreCase) || log.Action.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                .OrderBy(log => log.Timestamp)
                .Select(log => (DateTime?)log.Timestamp)
                .FirstOrDefault();

            if (approvedAt.HasValue)
            {
                approvalHours.Add(decimal.Round((decimal)(approvedAt.Value - submittedAt.Value).TotalHours, 2));
            }

            if (decidedAt.HasValue)
            {
                decisionHours.Add(decimal.Round((decimal)(decidedAt.Value - submittedAt.Value).TotalHours, 2));
            }
        }

        return new ReviewTurnaroundInsightResponse(
            approvalHours.Count > 0 ? decimal.Round(approvalHours.Average(), 2) : 0m,
            decisionHours.Count > 0 ? decimal.Round(decisionHours.Average(), 2) : 0m);
    }

    private static MonthlyHighRiskInsightResponse[] BuildMonthlyHighRiskTrend(IEnumerable<Expense> tenantExpenses, IReadOnlyDictionary<Guid, RiskEvaluationResult> assessments)
    {
        var expenseLookup = tenantExpenses.ToLookup(expense => new DateTime(expense.Date.Year, expense.Date.Month, 1));

        return Enumerable.Range(0, 6)
            .Select(offset => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-5 + offset))
            .Select(month =>
            {
                var expensesInMonth = expenseLookup[month].ToList();
                var reviewedCount = expensesInMonth.Count(expense => expense.Status.Equals(ExpenseStatuses.Approved, StringComparison.OrdinalIgnoreCase) || expense.Status.Equals(ExpenseStatuses.Rejected, StringComparison.OrdinalIgnoreCase));
                var highRiskCount = expensesInMonth.Count(expense => assessments.TryGetValue(expense.Id, out var assessment) && assessment.RiskLevel == "High");
                return new MonthlyHighRiskInsightResponse(month.ToString("MMM yyyy"), highRiskCount, reviewedCount);
            })
            .ToArray();
    }

    private static MonthlyPolicyTriggerInsightResponse[] BuildMonthlyPolicyTriggerTrend(IEnumerable<Expense> tenantExpenses, IReadOnlyDictionary<Guid, RiskEvaluationResult> assessments)
    {
        var expenseLookup = tenantExpenses.ToLookup(expense => new DateTime(expense.Date.Year, expense.Date.Month, 1));

        return Enumerable.Range(0, 6)
            .Select(offset => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-5 + offset))
            .Select(month =>
            {
                var expensesInMonth = expenseLookup[month];
                var triggeredCount = expensesInMonth
                    .Where(expense => assessments.TryGetValue(expense.Id, out _))
                    .Sum(expense => assessments[expense.Id].PolicyTriggers.Length);

                return new MonthlyPolicyTriggerInsightResponse(month.ToString("MMM yyyy"), triggeredCount);
            })
            .ToArray();
    }

    private async Task<PolicyRecommendationResponse[]> BuildPolicyRecommendationsAsync(Tenant tenant, IReadOnlyCollection<Expense> tenantExpenses, IReadOnlyDictionary<Guid, RiskEvaluationResult> assessments)
    {
        var recommendations = new List<PolicyRecommendationResponse>();
        var allTenants = await _tenantRepository.GetAllAsync();
        var similarTenantCount = Math.Max(1, allTenants.Count(candidate =>
            candidate.Id != tenant.Id
            && candidate.PlanType.Equals(tenant.PlanType, StringComparison.OrdinalIgnoreCase)));

        var alcoholExpenses = tenantExpenses
            .Where(expense => expense.Category.Contains("alcohol", StringComparison.OrdinalIgnoreCase)
                || expense.Category.Contains("wine", StringComparison.OrdinalIgnoreCase)
                || expense.Category.Contains("beer", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var alcoholOverspend = alcoholExpenses
            .Where(expense => expense.Amount > 50m)
            .Sum(expense => expense.Amount - 50m);

        if (alcoholOverspend > 0)
        {
            recommendations.Add(new PolicyRecommendationResponse(
                "Limit alcohol spend to $50",
                "Set or reinforce a $50 alcohol cap to reduce repeated policy-triggered reimbursements.",
                decimal.Round(alcoholOverspend, 2),
                $"{similarTenantCount} similar {tenant.PlanType} tenant(s) are used as the benchmark cohort."));
        }

        var highestRiskCategory = tenantExpenses
            .GroupBy(expense => expense.Category)
            .Select(group =>
            {
                var highRiskCount = group.Count(expense => assessments.TryGetValue(expense.Id, out var assessment) && assessment.RiskLevel == "High");
                var spend = group.Sum(expense => expense.Amount);
                return new { Category = group.Key, HighRiskCount = highRiskCount, Spend = spend };
            })
            .OrderByDescending(item => item.HighRiskCount)
            .ThenByDescending(item => item.Spend)
            .FirstOrDefault(item => item.HighRiskCount > 0);

        if (highestRiskCategory is not null)
        {
            recommendations.Add(new PolicyRecommendationResponse(
                $"Tighten {highestRiskCategory.Category} review",
                $"Require manager pre-approval for {highestRiskCategory.Category.ToLowerInvariant()} claims above the tenant median.",
                decimal.Round(highestRiskCategory.Spend * 0.12m, 2),
                $"Benchmark: high-risk categories typically fall after targeted pre-approval rules in similar {tenant.PlanType} tenants."));
        }

        var nonBaseCurrencyExpenses = tenantExpenses.Where(e => !e.Currency.Equals(tenant.BaseCurrency, StringComparison.OrdinalIgnoreCase)).ToList();
        if (nonBaseCurrencyExpenses.Count > 0)
        {
            var topForeignCurrency = nonBaseCurrencyExpenses.GroupBy(e => e.Currency)
                .OrderByDescending(g => g.Sum(e => e.BaseAmount))
                .First();

            var foreignSpend = topForeignCurrency.Sum(e => e.BaseAmount);
            if (foreignSpend > 5000m) // Arbitrary threshold for suggesting a hedge
            {
                var estimatedFxFees = foreignSpend * 0.03m; // Assume 3% average FX fee
                recommendations.Add(new PolicyRecommendationResponse(
                    $"Consider hedging or local cards for {topForeignCurrency.Key}",
                    $"You have significant spend ({foreignSpend:C} {tenant.BaseCurrency}) in {topForeignCurrency.Key}. Consider issuing local currency corporate cards to reduce FX fees.",
                    decimal.Round(estimatedFxFees, 2),
                    $"Benchmark: Companies with >$5k international spend typically save ~3% by issuing local cards."
                ));
            }
        }

        if (recommendations.Count == 0)
        {
            recommendations.Add(new PolicyRecommendationResponse(
                "Maintain current policy thresholds",
                "Current risk and rejection patterns do not show a category-specific savings opportunity yet.",
                0m,
                $"Benchmark: tenant is tracking within the expected range for {tenant.PlanType} peers."));
        }

        return recommendations.Take(3).ToArray();
    }

    private static EmployeeBehaviorInsightResponse[] BuildEmployeeBehaviorInsights(IReadOnlyCollection<Expense> tenantExpenses)
    {
        var insights = new List<EmployeeBehaviorInsightResponse>();

        foreach (var group in tenantExpenses.GroupBy(expense => expense.User?.Email ?? "Unknown employee"))
        {
            var fridayLateReceipts = group.Count(expense =>
                expense.Date.DayOfWeek == DayOfWeek.Friday
                && expense.CreatedAt > expense.Date.Date.AddDays(2));

            if (fridayLateReceipts >= 2)
            {
                insights.Add(new EmployeeBehaviorInsightResponse(
                    group.Key,
                    "Travel receipts are often submitted late after Friday expenses.",
                    "Upload receipts before the weekend to avoid review delays.",
                    fridayLateReceipts));
            }

            var missingJustification = group.Count(expense => string.IsNullOrWhiteSpace(expense.Description));
            if (missingJustification >= 3)
            {
                insights.Add(new EmployeeBehaviorInsightResponse(
                    group.Key,
                    "Several claims are missing business justification.",
                    "Add a short business purpose when creating the expense.",
                    missingJustification));
            }
        }

        return insights
            .OrderByDescending(item => item.SignalCount)
            .ThenBy(item => item.EmployeeEmail)
            .Take(5)
            .ToArray();
    }

    private OperationalKpiInsightResponse BuildOperationalKpis(IEnumerable<Expense> tenantExpenses, IEnumerable<AuditLog> auditLogs, IReadOnlyDictionary<Guid, RiskEvaluationResult> assessments)
    {
        const decimal slaHoursThreshold = 48m;
        var logsByExpense = auditLogs
            .Where(log => log.ExpenseId.HasValue)
            .GroupBy(log => log.ExpenseId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(log => log.Timestamp).ToList());

        var totalDecisions = 0;
        var slaBreachedDecisions = 0;

        foreach (var expense in tenantExpenses)
        {
            if (!logsByExpense.TryGetValue(expense.Id, out var logs))
            {
                continue;
            }

            var submittedAt = logs.FirstOrDefault(log => log.Action.Equals("Submitted", StringComparison.OrdinalIgnoreCase))?.Timestamp;
            var decidedAt = logs.FirstOrDefault(log => log.Action.Equals("Approved", StringComparison.OrdinalIgnoreCase) || log.Action.Equals("Rejected", StringComparison.OrdinalIgnoreCase))?.Timestamp;
            if (!submittedAt.HasValue || !decidedAt.HasValue)
            {
                continue;
            }

            totalDecisions++;
            var hoursToDecision = (decimal)(decidedAt.Value - submittedAt.Value).TotalHours;
            if (hoursToDecision > slaHoursThreshold)
            {
                slaBreachedDecisions++;
            }
        }

        var escalationCount = tenantExpenses.Count(expense =>
        {
            if (!assessments.TryGetValue(expense.Id, out var assessment))
            {
                return false;
            }

            var recommendation = _reviewAssistantService.BuildReview(expense.Id, tenantExpenses, expense, assessment).Recommendation;
            return recommendation.Equals("Escalate", StringComparison.OrdinalIgnoreCase);
        });

        var expenseCount = tenantExpenses.Count();
        var slaBreachRate = totalDecisions == 0 ? 0m : decimal.Round((decimal)slaBreachedDecisions / totalDecisions * 100m, 2);
        var escalationRate = expenseCount == 0 ? 0m : decimal.Round((decimal)escalationCount / expenseCount * 100m, 2);

        return new OperationalKpiInsightResponse(slaBreachRate, escalationRate, totalDecisions, slaBreachedDecisions, escalationCount);
    }

    private async Task<LearningMetricsResponse> BuildLearningMetricsAsync(Guid tenantId)
    {
        var feedback = await _context.ExpenseReviewFeedback
            .Where(item => item.TenantId == tenantId)
            .AsNoTracking()
            .OrderBy(item => item.CreatedAt)
            .ToListAsync();

        var feedbackCount = feedback.Count;
        var falsePositiveCount = feedback.Count(item => item.WasFalsePositive);
        var autoApprovalFalsePositiveCount = feedback.Count(item => item.WasFalsePositive && item.WasAutoApproved);
        var falsePositiveRate = feedbackCount == 0 ? 0m : decimal.Round((decimal)falsePositiveCount / feedbackCount * 100m, 2);
        var currentConfidence = decimal.Round(Math.Max(50m, 95m - falsePositiveRate), 2);

        var midpoint = feedbackCount / 2;
        var early = midpoint == 0 ? feedback : feedback.Take(midpoint).ToList();
        var recent = midpoint == 0 ? feedback : feedback.Skip(midpoint).ToList();
        var earlyConfidence = CalculateConfidenceFromFeedback(early);
        var recentConfidence = CalculateConfidenceFromFeedback(recent);
        var trend = decimal.Round(recentConfidence - earlyConfidence, 2);

        return new LearningMetricsResponse(
            feedbackCount,
            falsePositiveCount,
            autoApprovalFalsePositiveCount,
            falsePositiveRate,
            currentConfidence,
            trend);
    }

    private async Task<Dictionary<Guid, RiskEvaluationResult>> ApplyLearningAdjustmentsAsync(
        Guid tenantId,
        Dictionary<Guid, RiskEvaluationResult> assessments,
        IReadOnlyCollection<Expense> expenses)
    {
        var feedback = await _context.ExpenseReviewFeedback
            .Include(item => item.Expense)
            .Where(item => item.TenantId == tenantId)
            .AsNoTracking()
            .ToListAsync();

        if (feedback.Count == 0)
        {
            return assessments;
        }

        var adjusted = new Dictionary<Guid, RiskEvaluationResult>(assessments);
        foreach (var expense in expenses)
        {
            if (!adjusted.TryGetValue(expense.Id, out var assessment))
            {
                continue;
            }

            var categoryFeedback = feedback
                .Where(item => item.Expense != null && item.Expense.Category.Equals(expense.Category, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (categoryFeedback.Count == 0)
            {
                continue;
            }

            var falsePositiveCount = categoryFeedback.Count(item => item.WasFalsePositive);
            var highCorrectionCount = categoryFeedback.Count(item => item.CorrectedRiskLevel.Equals("High", StringComparison.OrdinalIgnoreCase));
            var scoreAdjustment = Math.Min(falsePositiveCount * 5, 15) - Math.Min(highCorrectionCount * 5, 10);

            if (scoreAdjustment == 0)
            {
                continue;
            }

            var score = Math.Clamp(assessment.RiskScore - scoreAdjustment, 0, 100);
            var riskLevel = score >= 70 ? "High" : score >= 35 ? "Medium" : "Low";
            var reasons = assessment.RiskReasons
                .Where(reason => !reason.StartsWith("Tenant learning adjusted", StringComparison.OrdinalIgnoreCase))
                .Append(scoreAdjustment > 0
                    ? $"Tenant learning adjusted score down after {falsePositiveCount} similar manager correction(s)."
                    : $"Tenant learning adjusted score up after {highCorrectionCount} similar high-risk correction(s).")
                .ToArray();

            adjusted[expense.Id] = new RiskEvaluationResult(score, riskLevel, reasons, assessment.PolicyTriggers);
        }

        return adjusted;
    }

    private static decimal CalculateConfidenceFromFeedback(IReadOnlyCollection<ExpenseReviewFeedback> feedback)
    {
        if (feedback.Count == 0)
        {
            return 75m;
        }

        var falsePositiveRate = (decimal)feedback.Count(item => item.WasFalsePositive) / feedback.Count * 100m;
        return decimal.Round(Math.Max(50m, 95m - falsePositiveRate), 2);
    }

    private static string? NormalizeRiskLevel(string riskLevel)
    {
        if (riskLevel.Equals("Low", StringComparison.OrdinalIgnoreCase)) return "Low";
        if (riskLevel.Equals("Medium", StringComparison.OrdinalIgnoreCase)) return "Medium";
        if (riskLevel.Equals("High", StringComparison.OrdinalIgnoreCase)) return "High";
        return null;
    }

    private static decimal CalculateConfidence(List<(DateTime Month, decimal Value)> historicalMonths, decimal dailyAverage, decimal currentMonthTotal)
    {
        if (historicalMonths.Count == 0) return 30m;
        
        var avgDaily = (double)historicalMonths.Average(m => m.Value / 30m);
        var variance = historicalMonths.Count > 1 
            ? Math.Sqrt(historicalMonths.Sum(m => Math.Pow((double)((m.Value / 30m) - (decimal)avgDaily), 2)) / (historicalMonths.Count - 1)) 
            : 0;
        
        var stabilityFactor = Math.Exp(-(double)(variance / avgDaily));
        var currentDay = DateTime.UtcNow.Day;
        var progressFactor = Math.Min(1.0, (double)currentDay / 30.0);
        
        return Math.Min(95m, Math.Max(30m, decimal.Round(30 + (decimal)(stabilityFactor * 50 + progressFactor * 15), 1)));
    }
}
