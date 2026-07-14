using VeriSpend.Api.Common;
using VeriSpend.Api.Dtos.Subscription;
using VeriSpend.Api.Models;
using VeriSpend.Api.Repositories;

namespace VeriSpend.Api.Services;

public sealed class SubscriptionService : ISubscriptionService
{
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly ITenantRepository _tenantRepository;

    private static readonly Dictionary<string, (string name, decimal monthly, decimal annual, int expenses, int seats, string[] features)> Plans = new()
    {
        {
            "starter",
            (
                "Starter",
                29m,
                319m,
                500,
                1,
                new[]
                {
                    "Up to 500 expenses/month",
                    "AI categorization",
                    "Basic receipt scanning",
                    "Email support",
                    "1 user seat"
                }
            )
        },
        {
            "professional",
            (
                "Professional",
                79m,
                869m,
                5000,
                10,
                new[]
                {
                    "Up to 5,000 expenses/month",
                    "Advanced anomaly detection",
                    "Unlimited receipt scanning",
                    "Priority support",
                    "10 user seats",
                    "Custom audit reports",
                    "API access"
                }
            )
        },
        {
            "enterprise",
            (
                "Enterprise",
                299m,
                3288m,
                999999,
                999999,
                new[]
                {
                    "Unlimited expenses",
                    "Custom AI models",
                    "SSO & SAML",
                    "Dedicated account manager",
                    "Unlimited seats",
                    "Custom integrations",
                    "SLA guarantee",
                    "On-premise option"
                }
            )
        }
    };

    public SubscriptionService(
        ISubscriptionRepository subscriptionRepository,
        ITenantRepository tenantRepository)
    {
        _subscriptionRepository = subscriptionRepository;
        _tenantRepository = tenantRepository;
    }

    public Task<ApiResult<GetPlansResponse>> GetAvailablePlansAsync()
    {
        var plans = Plans.Select(kvp =>
        {
            var planId = kvp.Key;
            var (name, monthly, annual, expenses, seats, features) = kvp.Value;

            return new SubscriptionPlanDto(
                Id: planId,
                Name: name,
                Description: $"Perfect for {(planId == "starter" ? "small teams" : planId == "professional" ? "growing teams" : "large organizations")}",
                MonthlyPrice: monthly,
                AnnualPrice: annual,
                ExpenseLimit: expenses,
                UserSeats: seats,
                AdvancedAnomalyDetection: planId is "professional" or "enterprise",
                UnlimitedReceiptScanning: planId is "professional" or "enterprise",
                PrioritySupport: planId is "professional" or "enterprise",
                CustomAuditReports: planId is "professional" or "enterprise",
                ApiAccess: planId is "professional" or "enterprise",
                CustomAiModels: planId == "enterprise",
                Sso: planId == "enterprise",
                DedicatedAccountManager: planId == "enterprise",
                CustomIntegrations: planId == "enterprise",
                OnPremiseOption: planId == "enterprise",
                SlaGuarantee: planId == "enterprise",
                Features: features
            );
        }).ToArray();

        var response = new GetPlansResponse(plans);
        return Task.FromResult(ApiResult<GetPlansResponse>.Ok(response));
    }

    public async Task<ApiResult<SubscriptionResponse>> SubscribeAsync(Guid tenantId, SubscribeRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<SubscriptionResponse>.Fail("Tenant not found.");
        }

        if (!Plans.ContainsKey(request.PlanId))
        {
            return ApiResult<SubscriptionResponse>.Fail("Invalid plan ID.");
        }

        if (request.BillingCycle is not ("monthly" or "annual"))
        {
            return ApiResult<SubscriptionResponse>.Fail("Billing cycle must be 'monthly' or 'annual'.");
        }

        // Cancel existing active subscription
        var existing = await _subscriptionRepository.GetByTenantIdAsync(tenantId);
        if (existing is not null)
        {
            existing.Cancelled = true;
            existing.IsActive = false;
            existing.Status = "cancelled";
            existing.CancelledAt = DateTime.UtcNow;
            await _subscriptionRepository.UpdateAsync(existing);
        }

        var (name, monthly, annual, _, _, _) = Plans[request.PlanId];
        var now = DateTime.UtcNow;
        var renewalDate = request.BillingCycle == "monthly" ? now.AddMonths(1) : now.AddYears(1);

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PlanId = request.PlanId,
            PlanName = name,
            MonthlyPrice = monthly,
            AnnualPrice = annual,
            BillingCycle = request.BillingCycle,
            StartDate = now,
            RenewalDate = renewalDate,
            IsActive = true,
            Status = "active"
        };

        await _subscriptionRepository.AddAsync(subscription);
        tenant.PlanType = name;
        await _subscriptionRepository.SaveChangesAsync();

        var response = new SubscriptionResponse(
            subscription.Id,
            subscription.TenantId,
            subscription.PlanId,
            subscription.PlanName,
            subscription.MonthlyPrice,
            subscription.AnnualPrice,
            subscription.BillingCycle,
            subscription.StartDate,
            subscription.RenewalDate,
            subscription.IsActive,
            subscription.Cancelled,
            subscription.CancelledAt,
            subscription.Status
        );

        return ApiResult<SubscriptionResponse>.Ok(response);
    }

    public async Task<ApiResult<CurrentSubscriptionResponse>> GetCurrentSubscriptionAsync(Guid tenantId)
    {
        var subscription = await _subscriptionRepository.GetByTenantIdAsync(tenantId);
        if (subscription is null)
        {
            return ApiResult<CurrentSubscriptionResponse>.Fail("No active subscription found.");
        }

        var daysUntilRenewal = subscription.RenewalDate.HasValue
            ? (int)(subscription.RenewalDate.Value - DateTime.UtcNow).TotalDays
            : 0;

        var price = subscription.BillingCycle == "monthly" ? subscription.MonthlyPrice : subscription.AnnualPrice;

        var response = new CurrentSubscriptionResponse(
            PlanId: subscription.PlanId,
            PlanName: subscription.PlanName,
            Price: price,
            BillingCycle: subscription.BillingCycle,
            StartDate: subscription.StartDate,
            RenewalDate: subscription.RenewalDate,
            IsActive: subscription.IsActive,
            DaysUntilRenewal: Math.Max(0, daysUntilRenewal),
            Status: subscription.Status
        );

        return ApiResult<CurrentSubscriptionResponse>.Ok(response);
    }

    public async Task<ApiResult<BillingHistoryItemResponse[]>> GetBillingHistoryAsync(Guid tenantId)
    {
        var subscription = await _subscriptionRepository.GetByTenantIdAsync(tenantId);
        if (subscription is null)
        {
            return ApiResult<BillingHistoryItemResponse[]>.Fail("No subscription found.");
        }

        // Simulate billing history (in production, query a BillingHistory table)
        var history = new List<BillingHistoryItemResponse>();

        var currentDate = DateTime.UtcNow;
        for (int i = 0; i < 6; i++)
        {
            var billingDate = subscription.BillingCycle == "monthly"
                ? currentDate.AddMonths(-i)
                : currentDate.AddYears(-i);

            if (i == 0 || billingDate >= subscription.StartDate)
            {
                var price = subscription.BillingCycle == "monthly" ? subscription.MonthlyPrice : subscription.AnnualPrice;
                history.Add(new BillingHistoryItemResponse(
                    Id: Guid.NewGuid(),
                    Date: billingDate,
                    Description: $"{subscription.PlanName} subscription ({subscription.BillingCycle})",
                    Amount: price,
                    Status: "Paid",
                    PlanName: subscription.PlanName,
                    BillingCycle: subscription.BillingCycle
                ));
            }
        }

        return ApiResult<BillingHistoryItemResponse[]>.Ok(history.OrderByDescending(x => x.Date).ToArray());
    }

    public async Task<ApiResult> CancelSubscriptionAsync(Guid tenantId)
    {
        var subscription = await _subscriptionRepository.GetByTenantIdAsync(tenantId);
        if (subscription is null)
        {
            return ApiResult.Fail("No active subscription found.");
        }

        subscription.Cancelled = true;
        subscription.IsActive = false;
        subscription.Status = "cancelled";
        subscription.CancelledAt = DateTime.UtcNow;

        await _subscriptionRepository.UpdateAsync(subscription);
        await _subscriptionRepository.SaveChangesAsync();

        return ApiResult.Ok();
    }

    public async Task<ApiResult<SubscriptionResponse>> UpgradeSubscriptionAsync(Guid tenantId, UpgradeSubscriptionRequest request)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return ApiResult<SubscriptionResponse>.Fail("Tenant not found.");
        }

        if (!Plans.ContainsKey(request.NewPlanId))
        {
            return ApiResult<SubscriptionResponse>.Fail("Invalid plan ID.");
        }

        var currentSubscription = await _subscriptionRepository.GetByTenantIdAsync(tenantId);
        if (currentSubscription is null)
        {
            return ApiResult<SubscriptionResponse>.Fail("No active subscription found.");
        }

        // Cancel old subscription
        currentSubscription.Cancelled = true;
        currentSubscription.IsActive = false;
        currentSubscription.Status = "cancelled";
        currentSubscription.CancelledAt = DateTime.UtcNow;
        await _subscriptionRepository.UpdateAsync(currentSubscription);

        // Create new subscription maintaining billing cycle
        var (name, monthly, annual, _, _, _) = Plans[request.NewPlanId];
        var now = DateTime.UtcNow;
        var renewalDate = currentSubscription.BillingCycle == "monthly" ? now.AddMonths(1) : now.AddYears(1);

        var newSubscription = new Subscription
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PlanId = request.NewPlanId,
            PlanName = name,
            MonthlyPrice = monthly,
            AnnualPrice = annual,
            BillingCycle = currentSubscription.BillingCycle,
            StartDate = now,
            RenewalDate = renewalDate,
            IsActive = true,
            Status = "active"
        };

        await _subscriptionRepository.AddAsync(newSubscription);
        tenant.PlanType = name;
        await _subscriptionRepository.SaveChangesAsync();

        var response = new SubscriptionResponse(
            newSubscription.Id,
            newSubscription.TenantId,
            newSubscription.PlanId,
            newSubscription.PlanName,
            newSubscription.MonthlyPrice,
            newSubscription.AnnualPrice,
            newSubscription.BillingCycle,
            newSubscription.StartDate,
            newSubscription.RenewalDate,
            newSubscription.IsActive,
            newSubscription.Cancelled,
            newSubscription.CancelledAt,
            newSubscription.Status
        );

        return ApiResult<SubscriptionResponse>.Ok(response);
    }
}
