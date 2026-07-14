using Microsoft.AspNetCore.Http;
using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Ai;
using VeriSpend.Api.Dtos.Expenses;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class AiService : IAiService
{
    private readonly IAiReceiptService _aiReceiptService;
    private readonly IExpenseRepository _expenseRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IRiskAssessmentService _riskAssessmentService;
    private readonly IReviewAssistantService _reviewAssistantService;
    private readonly ILogger<AiService> _logger;

    public AiService(
        IAiReceiptService aiReceiptService,
        IExpenseRepository expenseRepository,
        ITenantRepository tenantRepository,
        IAuditLogService auditLogService,
        IRiskAssessmentService riskAssessmentService,
        IReviewAssistantService reviewAssistantService,
        ILogger<AiService> logger)
    {
        _aiReceiptService = aiReceiptService;
        _expenseRepository = expenseRepository;
        _tenantRepository = tenantRepository;
        _auditLogService = auditLogService;
        _riskAssessmentService = riskAssessmentService;
        _reviewAssistantService = reviewAssistantService;
        _logger = logger;
    }

    public async Task<ApiResult<AiUploadResponse>> UploadReceiptAsync(IFormFile file, Guid tenantId)
    {
        if (file is null || file.Length == 0)
        {
            _logger.LogWarning("Receipt upload rejected because file was missing. TenantId={TenantId}", tenantId);
            return ApiResult<AiUploadResponse>.Fail("Receipt file is required.");
        }

        _logger.LogInformation(
            "Starting receipt upload. TenantId={TenantId}, FileName={FileName}, Length={Length}, ContentType={ContentType}",
            tenantId,
            file.FileName,
            file.Length,
            file.ContentType);

        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            _logger.LogWarning("Receipt upload failed because tenant context was missing. TenantId={TenantId}", tenantId);
            return ApiResult<AiUploadResponse>.Fail("Tenant context is missing.");
        }

        var fileUrl = await _aiReceiptService.SaveReceiptFileAsync(file);
        var results = await _aiReceiptService.ExtractReceiptAsync(file, tenant.MaxSpendLimit);

        _logger.LogInformation(
            "Receipt upload processed. TenantId={TenantId}, FileUrl={FileUrl}, Merchant={Merchant}, Amount={Amount}, Category={Category}, Flagged={Flagged}",
            tenantId,
            fileUrl,
            results.Merchant,
            results.Amount,
            results.Category,
            results.Flagged);

        var response = new AiUploadResponse(Guid.NewGuid(), results.Amount, results.Currency, results.Merchant, results.Category, results.Date, results.Flagged, fileUrl, results.Message, results.OcrRawData);
        return ApiResult<AiUploadResponse>.Ok(response);
    }

    public async Task<ApiResult<ExpenseResponse>> ConfirmReceiptAsync(Guid tenantId, Guid userId, string performedBy, AiConfirmRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            _logger.LogWarning("Receipt confirmation failed because tenant context was missing. TenantId={TenantId}, UserId={UserId}", tenantId, userId);
            return ApiResult<ExpenseResponse>.Fail("Tenant context is missing.");
        }

        _logger.LogInformation(
            "Creating expense from confirmed receipt. TenantId={TenantId}, UserId={UserId}, Merchant={Merchant}, Amount={Amount}, Category={Category}",
            tenantId,
            userId,
            request.Merchant,
            request.Amount,
            request.Category);

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            Amount = request.Amount,
            Currency = request.Currency,
            Merchant = request.Merchant,
            Category = request.Category,
            Description = request.Description,
            Status = ExpenseStatuses.Draft,
            Date = UtcDateTime.Normalize(request.Date),
            TenantId = tenantId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            Receipts = new List<Receipt>
            {
                new Receipt
                {
                    Id = Guid.NewGuid(),
                    FileUrl = request.FileUrl,
                    OcrRawData = request.OcrRawData,
                    UploadedAt = DateTime.UtcNow
                }
            }
        };

        var tenantExpenses = await _expenseRepository.GetTenantExpensesAsync(tenantId);
        var assessment = _riskAssessmentService.EvaluateExpense(expense, tenant.MaxSpendLimit, [ ..tenantExpenses, expense ]);
        expense.Flagged = assessment.PolicyTriggers.Length > 0;
        expense.FlagReason = assessment.PolicyTriggers.Length > 0 ? string.Join(" ", assessment.PolicyTriggers) : null;

        _logger.LogInformation(
            "Receipt confirmation risk evaluation complete. ExpenseId={ExpenseId}, RiskScore={RiskScore}, RiskLevel={RiskLevel}, TriggerCount={TriggerCount}",
            expense.Id,
            assessment.RiskScore,
            assessment.RiskLevel,
            assessment.PolicyTriggers.Length);

        await _expenseRepository.AddAsync(expense);
        await _auditLogService.LogExpenseCreatedAsync(expense, performedBy);
        await _expenseRepository.SaveChangesAsync();

        _logger.LogInformation(
            "Expense created from receipt confirmation. ExpenseId={ExpenseId}, TenantId={TenantId}, UserId={UserId}, ReceiptCount={ReceiptCount}",
            expense.Id,
            tenantId,
            userId,
            expense.Receipts.Count);

        var visibleExpenses = tenantExpenses.Where(candidate => candidate.UserId == userId).Append(expense).ToList();
        return ApiResult<ExpenseResponse>.Ok(ToResponse(expense, assessment, visibleExpenses));
    }

    public async Task<ApiResult<AiUsageResponse>> GetUsageAsync(Guid tenantId)
    {
        var monthStart = UtcDateTime.StartOfUtcMonth(DateTime.UtcNow);
        var scanCount = await _expenseRepository.CountReceiptsThisMonthAsync(tenantId, monthStart);
        var limit = 20;
        var usage = new AiUsageResponse(scanCount, Math.Max(0, limit - scanCount));
        return ApiResult<AiUsageResponse>.Ok(usage);
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
}
