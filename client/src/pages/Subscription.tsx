import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscriptionService,
  SubscriptionPlan,
  CurrentSubscription,
  BillingHistoryItem,
} from "@/services/subscriptionService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Loader2,
  CheckCircle,
  CreditCard,
  Calendar,
  TrendingUp,
  Check,
} from "lucide-react";

const Subscription = () => {
  const { user, refreshProfile } = useAuth();
  const canManageSubscription = user?.role === "Owner";
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      const [plansRes, subRes, historyRes] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getBillingHistory(),
      ]);

      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data.plans);
      } else {
        setError(plansRes.error || "Failed to load plans");
      }

      if (subRes.success && subRes.data) {
        setCurrentSubscription(subRes.data);
      }

      if (historyRes.success && historyRes.data) {
        setBillingHistory(historyRes.data);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!canManageSubscription) {
      setError("Only Workspace Owners can manage subscription tiers.");
      return;
    }
    setError("");
    setSelectedPlanId(planId);
    setIsSubscribing(true);

    const result = await subscriptionService.subscribe(planId, billingCycle);
    if (result.success) {
      await refreshProfile();
      setCurrentSubscription(null);
      const subRes = await subscriptionService.getCurrentSubscription();
      if (subRes.success && subRes.data) {
        setCurrentSubscription(subRes.data);
      }
    } else {
      setError(result.error || "Failed to subscribe");
    }

    setIsSubscribing(false);
    setSelectedPlanId(null);
  };

  const handleUpgrade = async (planId: string) => {
    if (!currentSubscription) return;
    if (!canManageSubscription) {
      setError("Only Workspace Owners can manage subscription tiers.");
      return;
    }

    setError("");
    setIsUpgrading(planId);
    const result = await subscriptionService.upgradeSubscription(planId);

    if (result.success) {
      await refreshProfile();
      const subRes = await subscriptionService.getCurrentSubscription();
      if (subRes.success && subRes.data) {
        setCurrentSubscription(subRes.data);
      }
    } else {
      setError(result.error || "Failed to upgrade subscription");
    }

    setIsUpgrading(null);
  };

  const handleCancel = async () => {
    if (!canManageSubscription) {
      setError("Only Workspace Owners can manage subscription tiers.");
      return;
    }
    if (!confirm("Are you sure you want to cancel your plan?")) {
      return;
    }

    setError("");
    setIsCancelling(true);
    const result = await subscriptionService.cancelSubscription();

    if (result.success) {
      await refreshProfile();
      setCurrentSubscription(null);
    } else {
      setError(result.error || "Failed to cancel subscription");
    }

    setIsCancelling(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl mx-auto font-sans text-xs">
        {/* Header */}
        <div className="border-b border-border/80 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Subscription & Billing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage organization tier limits, seat allowances, and invoice history.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!canManageSubscription && (
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your plan is managed by the organization owner. Contact your workspace administrator to modify billing tiers.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Active Plan Card */}
        {currentSubscription && (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success">{currentSubscription.status}</Badge>
                  <CardTitle>{currentSubscription.planName} Plan Active</CardTitle>
                </div>
                <Badge variant="outline" className="font-mono uppercase">
                  {currentSubscription.billingCycle}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-4 font-mono text-xs">
                <div>
                  <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Price</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">
                    ${currentSubscription.price.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/{currentSubscription.billingCycle}</p>
                </div>
                <div>
                  <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Start Date</p>
                  <p className="font-semibold text-foreground mt-1">
                    {new Date(currentSubscription.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Renewal Date</p>
                  <p className="font-semibold text-foreground mt-1">
                    {currentSubscription.renewalDate
                      ? new Date(currentSubscription.renewalDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Days Remaining</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">
                    {currentSubscription.daysUntilRenewal}
                  </p>
                  <p className="text-[10px] text-muted-foreground">days in cycle</p>
                </div>
              </div>

              {canManageSubscription && (
                <div className="pt-4 mt-4 border-t border-border/60 flex justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    {isCancelling && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plan Selection Section */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Available Organization Tiers</h2>
              <p className="text-[11px] text-muted-foreground">Choose the volume suitable for your team</p>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
              <Button
                variant={billingCycle === "monthly" ? "default" : "ghost"}
                size="xs"
                onClick={() => setBillingCycle("monthly")}
                className="h-6 text-xs font-semibold"
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "annual" ? "default" : "ghost"}
                size="xs"
                onClick={() => setBillingCycle("annual")}
                className="h-6 text-xs font-semibold"
              >
                Annual (Save 12%)
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = currentSubscription?.planId === plan.id;
              const canUpgrade = currentSubscription && plan.id !== currentSubscription.planId;
              const planOrder = { starter: 0, professional: 1, enterprise: 2 };
              const canOnlyUpgrade =
                canUpgrade &&
                (planOrder[plan.id as keyof typeof planOrder] || 0) >
                  (planOrder[currentSubscription?.planId as keyof typeof planOrder] || 0);

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between ${
                    isCurrentPlan ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  <CardHeader className="border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      {isCurrentPlan && <Badge variant="success">Active</Badge>}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2 font-mono">
                      <span className="text-2xl font-bold text-foreground">
                        ${billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.annualPrice / 12)}
                      </span>
                      <span className="text-muted-foreground text-xs">/mo</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-foreground">
                        {plan.expenseLimit.toLocaleString()} monthly claims
                      </p>
                      <p className="text-muted-foreground">
                        {plan.userSeats} team seat{plan.userSeats > 1 ? "s" : ""}
                      </p>
                      <ul className="space-y-1.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-1.5">
                            <Check className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      {isCurrentPlan ? (
                        <Button disabled size="xs" variant="outline" className="w-full font-bold">
                          Current Plan
                        </Button>
                      ) : canOnlyUpgrade ? (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={isUpgrading === plan.id || !canManageSubscription}
                          size="xs"
                          variant="signal"
                          className="w-full font-bold"
                        >
                          {isUpgrading === plan.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          Upgrade to {plan.name}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={(isSubscribing && selectedPlanId === plan.id) || !canManageSubscription}
                          size="xs"
                          variant="default"
                          className="w-full font-bold"
                        >
                          {isSubscribing && selectedPlanId === plan.id && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {!currentSubscription ? "Select Plan" : "Switch Plan"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Billing History Table */}
        {billingHistory.length > 0 && (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Invoice Ledger</CardTitle>
              <CardDescription>Historical billing receipts for accounting</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-1.5">
                {billingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5 text-xs font-mono"
                  >
                    <div>
                      <span className="font-semibold text-foreground font-sans">{item.description}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {new Date(item.date).toLocaleDateString()} • {item.planName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground tabular-nums">
                        ${item.amount.toFixed(2)}
                      </span>
                      <Badge variant="success">{item.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Subscription;
