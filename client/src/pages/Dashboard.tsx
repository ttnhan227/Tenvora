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
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
  Target,
  ShieldCheck,
  Zap
  ,ArrowRight,
  Building2,
  UsersRound,
  ReceiptText
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
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const COLORS = ["#10b981", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];

  const categoryData = stats?.insights.topCategories || [];
  const chartData = [
    { name: "Current Month", value: stats?.insights.currentMonthTotal || 0 },
    { name: "Previous Month", value: stats?.insights.previousMonthTotal || 0 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (user?.role === "Owner" && (stats?.expenseCount ?? 0) === 0) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-6 py-4">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-8 shadow-xl md:p-12">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <ShieldCheck className="h-4 w-4" /> New organization workspace
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Welcome to VeriSpend, {user.companyName}</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">Your workspace is secure and ready. Complete the setup checklist below before your team starts submitting company expenses.</p>
              <Button asChild size="lg" className="mt-7 rounded-full px-7">
                <Link to="/onboarding">Start guided setup <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Building2, step: "01", title: "Define company controls", detail: "Set review thresholds, expense policy, category budgets, and approval automation." },
              { icon: UsersRound, step: "02", title: "Invite your finance team", detail: "Add a Manager who can investigate risk signals and make approval decisions." },
              { icon: ReceiptText, step: "03", title: "Upload the first receipt", detail: "Create the first real expense and watch extraction, risk assessment, and audit logging work." },
            ].map((item) => (
              <Card key={item.step} className="rounded-3xl border-border bg-card/70">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><item.icon className="h-5 w-5" /></div><span className="font-mono text-xs text-muted-foreground">{item.step}</span></div>
                  <h2 className="mt-6 font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-5">
            <div><p className="text-sm font-semibold">Want to understand the product before configuring it?</p><p className="mt-1 text-xs text-muted-foreground">The isolated demo workspace contains realistic review cases and is separate from this company.</p></div>
            <Button asChild variant="outline" className="rounded-full"><Link to="/login">Open demo</Link></Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="rounded-3xl border border-border bg-card/65 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono tracking-[0.28em] text-primary bg-primary/5 px-2 py-0.5 border border-primary/10 rounded">
                  System Overview
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                  <ShieldCheck className="h-3 w-3 text-primary animate-pulse" />
                  VeriSpend Safeguards Enabled
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back! View your expense stats, compliance levels, and policy alerts.
              </p>
            </div>
            <div className="font-mono text-xs text-muted-foreground flex items-center gap-2 bg-muted border border-border px-3 py-1.5 rounded-2xl">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>AI System: Online</span>
            </div>
          </div>
        </div>

        {/* Subscription Banner */}
        {canAccessSubscription && subscription && (
          <div className={`rounded-2xl border bg-card/45 backdrop-blur-md px-5 py-3 shadow-md ${
            subscription.status === "active" 
              ? "border-primary/25" 
              : "border-destructive/25"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <span className="font-bold text-foreground">
                  {subscription.planName.toUpperCase()} PLAN ACTIVE
                </span>
                <span className="text-border">|</span>
                <span className="text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Calendar className="h-3.5 w-3.5" />
                  Renews {new Date(subscription.renewalDate!).toLocaleDateString()}
                </span>
              </div>
              <Button asChild variant="ghost" className="h-7 rounded-full text-xs text-primary hover:text-primary/95 hover:bg-primary/5 px-3">
                <Link to="/subscription">Manage Subscription →</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions Panel */}
        {canUseSubmitterFeatures && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Button asChild size="lg" className="rounded-2xl gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md py-6">
              <Link to="/expenses/create">
                <Plus className="h-5 w-5" />
                Create New Expense
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl gap-2 border-border bg-card text-foreground hover:bg-muted py-6">
              <Link to="/upload">
                <Upload className="h-5 w-5" />
                Upload Receipt Image
              </Link>
            </Button>
          </div>
        )}

        {/* Five Stat Grid Matrix */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-xl font-bold text-foreground font-mono">{formatCurrency(stats?.totalSpent || 0)}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                {stats?.expenseCount || 0} expenses logged
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auto-Approved</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-xl font-bold text-foreground font-mono">{stats?.autoApprovedCount || 0}</div>
              <p className="text-[10px] text-primary mt-1 uppercase">
                Cleared by AI Guardrails
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Spend</CardTitle>
              <TrendingUp className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-xl font-bold text-foreground font-mono">{formatCurrency(stats?.averageSpend || 0)}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase">Per expense</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-xl font-bold text-foreground font-mono">{stats?.pendingCount || 0}</div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 uppercase">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">High Risk Claims</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-xl font-bold text-foreground font-mono">{stats?.highRiskCount || 0}</div>
              <p className="text-[10px] text-destructive mt-1 uppercase font-mono">
                Avg score: {Math.round(stats?.averageRiskScore || 0)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Budget Forecast - Managers/Owners Only */}
        {isManager && budgetPrediction && (
          <Card className="rounded-3xl bg-card/65 border border-border shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                  AI Budget Guardrails Forecast
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Projected Month-End Spend</span>
                  <p className="text-3xl font-black text-foreground font-mono">{formatCurrency(budgetPrediction.predictedMonthTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {budgetPrediction.daysRemaining} days remaining this month
                  </p>
                </div>
                <Badge 
                  variant="outline"
                  className={`text-xs px-3 py-1 font-bold rounded-xl border ${
                    budgetPrediction.healthStatus === "Healthy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                    budgetPrediction.healthStatus === "Warning" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : 
                    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-sm"
                  }`}
                >
                  Budget health: {budgetPrediction.healthStatus.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2 bg-muted/20 border border-border p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Confidence Score:</span>
                  <span className="text-primary font-mono">{budgetPrediction.confidencePercentage}% confidence</span>
                </div>
                <Progress value={budgetPrediction.confidencePercentage} className="h-1.5" />
              </div>

              {budgetPrediction.categoryPredictions.length > 0 && (
                <div className="grid gap-3 pt-2 border-t border-border sm:grid-cols-3">
                  {budgetPrediction.categoryPredictions.slice(0, 3).map((prediction) => (
                    <div key={prediction.category} className="bg-muted/30 border border-border rounded-xl p-3 text-xs">
                      <p className="font-bold text-foreground uppercase tracking-wider">{prediction.category}</p>
                      <div className="flex items-center justify-between mt-2 font-mono">
                        <span className="text-muted-foreground">Projected:</span>
                        <span className={prediction.willExceedBudget ? "text-destructive font-extrabold" : "text-primary font-semibold"}>
                          {prediction.predictedUsagePercentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts & Trends */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Monthly Comparison */}
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Monthly Trend Comparison</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sector Aggregations */}
          {categoryData.length > 0 && (
            <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, totalSpent }) =>
                        `${category}: ${Math.round((totalSpent / (stats?.totalSpent || 1)) * 100)}%`
                      }
                      outerRadius={75}
                      fill="hsl(var(--primary))"
                      dataKey="totalSpent"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Change stats */}
        <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-muted/20 px-6 py-4 border-b border-border">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Month-over-Month Growth Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 pt-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground uppercase">Change Amount:</span>
              <Badge
                variant="outline"
                className={`font-mono text-xs rounded border ${
                  (stats?.insights.changeAmount || 0) > 0 
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" 
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                }`}
              >
                {stats?.insights.changeAmount && stats.insights.changeAmount > 0 ? "+" : ""}
                {stats?.insights.changeAmount ? formatCurrency(stats.insights.changeAmount) : "$0.00"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground uppercase">Change Percentage:</span>
              <Badge 
                variant="outline"
                className={`font-mono text-xs rounded border ${
                  (stats?.insights.changePercentage || 0) > 0 
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" 
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                }`}
              >
                {stats?.insights.changePercentage && stats.insights.changePercentage > 0 ? "+" : ""}
                {Math.round((stats?.insights.changePercentage || 0) * 100) / 100}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Manager tools */}
        {isManager && (
          <div className="rounded-3xl border border-border bg-card/65 p-4 shadow-xl backdrop-blur-md flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-muted-foreground uppercase font-bold">Manager Review Portals Available</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full text-xs border-border hover:bg-muted text-foreground">
                <Link to="/manager/pending">Review Pending Expenses</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full text-xs border-border hover:bg-muted text-foreground">
                <Link to="/manager/insights">View AI Policy Logs</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Anomaly Trend — managers only */}
        {isManager && auditInsights && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive animate-pulse" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">High Risk Claims Trend</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 font-mono">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={auditInsights.monthlyHighRiskTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="monthLabel" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", color: "hsl(var(--popover-foreground))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="highRiskCount" name="Flagged Risk" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="reviewedCount" name="Cleared Log" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Flag Rates by Category</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {auditInsights.highestFlaggedCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-10 text-center uppercase">Zero risk incidents reported.</p>
                ) : (
                  <div className="space-y-4">
                    {auditInsights.highestFlaggedCategories.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground uppercase">{cat.category}</span>
                          <span className="text-muted-foreground">{cat.flaggedCount}/{cat.expenseCount} flagged · <span className="text-destructive font-extrabold font-mono">{cat.flagRate}%</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden border border-border">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                            style={{ width: `${Math.min(cat.flagRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
