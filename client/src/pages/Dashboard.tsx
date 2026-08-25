import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { expenseService, ExpenseStats } from "@/services/expenseService";
import { managerService, AuditInsight, BudgetPrediction } from "@/services/managerService";
import { subscriptionService, CurrentSubscription } from "@/services/subscriptionService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  Upload,
  Loader2,
  ShieldAlert,
  CreditCard,
  Calendar,
  Brain,
  ShieldCheck,
  Zap,
  ArrowRight,
  Building2,
  UsersRound,
  ReceiptText,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditInsights, setAuditInsights] = useState<AuditInsight | null>(null);
  const [budgetPrediction, setBudgetPrediction] = useState<BudgetPrediction | null>(null);
  const isManager = user?.role === "Manager" || user?.role === "Owner";
  const canUseSubmitterFeatures = user?.role === "Owner" || user?.role === "Member";
  const canAccessSubscription = user?.role === "Owner" || user?.role === "Member";

  useEffect(() => {
    const fetchStats = async () => {
      const result = await expenseService.getStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (!canAccessSubscription) return;
    const fetchSubscription = async () => {
      const result = await subscriptionService.getCurrentSubscription();
      if (result.success && result.data) {
        setSubscription(result.data);
      }
    };

    fetchSubscription();
  }, [canAccessSubscription]);

  useEffect(() => {
    if (!isManager) return;
    const fetchInsights = async () => {
      const result = await managerService.getAuditInsights();
      if (result.success && result.data) {
        setAuditInsights(result.data);
      }
    };
    fetchInsights();
  }, [isManager]);

  useEffect(() => {
    if (!isManager) return;
    const fetchBudgetPrediction = async () => {
      const result = await managerService.getBudgetPrediction();
      if (result.success && result.data) {
        setBudgetPrediction(result.data);
      }
    };
    fetchBudgetPrediction();
  }, [isManager]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const categoryData = stats?.insights.topCategories || [];
  const chartData = [
    { name: "Prior Month", value: stats?.insights.previousMonthTotal || 0 },
    { name: "Current Month", value: stats?.insights.currentMonthTotal || 0 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const CATEGORY_COLORS = ["#0F172A", "#475569", "#94A3B8", "#CBD5E1", "#E2E8F0"];

  // Empty organization state for new owners
  if (user?.role === "Owner" && (stats?.expenseCount ?? 0) === 0) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-5 py-4 font-sans">
          {/* Welcome Banner */}
          <div className="rounded-md border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-signal))]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Organization Setup
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome to VeriSpend, {user.companyName}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground max-w-2xl">
              Your company workspace is provisioned. Configure approval policies, invite your team, and begin tracking company spend with automated audit controls.
            </p>
            <div className="mt-5">
              <Button asChild size="sm" variant="signal" className="font-bold gap-1.5">
                <Link to="/onboarding">
                  <span>Start Guided Setup</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Building2,
                step: "01",
                title: "Define Policy Controls",
                detail: "Set approval thresholds, category budget limits, and auto-approval rules.",
              },
              {
                icon: UsersRound,
                step: "02",
                title: "Invite Finance Team",
                detail: "Add Managers to review policy flags and approve reimbursement claims.",
              },
              {
                icon: ReceiptText,
                step: "03",
                title: "Upload First Receipt",
                detail: "Ingest a receipt to test automated OCR, risk scoring, and audit logging.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <item.icon className="h-4 w-4 text-foreground" />
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      STEP {item.step}
                    </span>
                  </div>
                  <h2 className="font-bold text-xs text-foreground mt-3">{item.title}</h2>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto font-sans">
        {/* Top Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Spend Overview</h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                LIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time spend metrics, policy compliance health, and automated guardrail forecasting.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <Link to="/upload">
              <Button size="xs" variant="outline" className="gap-1.5 font-semibold">
                <Upload className="h-3 w-3" />
                <span>Upload Receipt</span>
              </Button>
            </Link>
            <Link to="/expenses/create">
              <Button size="xs" variant="default" className="gap-1.5 font-bold">
                <Plus className="h-3 w-3" />
                <span>New Expense</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 5-Column Financial Metric Matrix */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Spending
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {formatCurrency(stats?.totalSpent || 0)}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {stats?.expenseCount || 0} claims logged
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Auto-Approved
            </p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {stats?.autoApprovedCount || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Cleared policy rules
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Average Claim
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {formatCurrency(stats?.averageSpend || 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Per transaction
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Queue
            </p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400 font-mono">
              {stats?.pendingCount || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Awaiting review
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-3.5 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              High Risk Claims
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-400 font-mono">
              {stats?.highRiskCount || 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Avg score: {Math.round(stats?.averageRiskScore || 0)}%
            </p>
          </div>
        </div>

        {/* AI Budget Forecast — Managers/Owners Only */}
        {isManager && budgetPrediction && (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-foreground" />
                  <CardTitle>Budget Guardrails & Month-End Forecast</CardTitle>
                </div>
                <Badge
                  variant={
                    budgetPrediction.healthStatus === "Healthy"
                      ? "success"
                      : budgetPrediction.healthStatus === "Warning"
                      ? "warning"
                      : "destructive"
                  }
                >
                  Budget Health: {budgetPrediction.healthStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Projected Month-End Spend
                  </span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {formatCurrency(budgetPrediction.predictedMonthTotal)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Based on {budgetPrediction.daysRemaining} days remaining in current billing cycle
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                    Confidence: {budgetPrediction.confidencePercentage}%
                  </span>
                  <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${budgetPrediction.confidencePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {budgetPrediction.categoryPredictions && budgetPrediction.categoryPredictions.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3 pt-2 border-t border-border/40">
                  {budgetPrediction.categoryPredictions.slice(0, 3).map((pred) => (
                    <div key={pred.category} className="rounded-md border border-border bg-muted/10 p-2.5 text-xs">
                      <p className="font-semibold text-foreground">{pred.category}</p>
                      <div className="flex items-center justify-between mt-1 font-mono text-[11px]">
                        <span className="text-muted-foreground">Projected Usage:</span>
                        <span className={pred.willExceedBudget ? "text-destructive font-bold" : "text-foreground font-semibold"}>
                          {pred.predictedUsagePercentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts: Monthly Trend & Category Distribution */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Monthly Comparison */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Spend Trajectory (Month-over-Month)</CardTitle>
              <CardDescription>Comparative spending between prior and active billing window</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle>Spend by Category</CardTitle>
                <CardDescription>Departmental allocation of processed transactions</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      dataKey="totalSpent"
                      nameKey="category"
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
