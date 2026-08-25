import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  CalendarDays,
  LayoutDashboard,
  Building,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  analyticsService,
  DepartmentBudgetPool,
  SeasonalAdjustment,
  CustomKpiDashboard,
  KpiMetric,
} from "@/services/analyticsService";

const TrendIcon = ({ trend }: { trend?: string }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const KpiCard = ({ metric }: { metric: KpiMetric }) => (
  <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {metric.name}
    </p>
    <div className="flex items-baseline justify-between">
      <p className="text-xl font-bold font-mono text-foreground">
        {metric.value}
        {metric.unit && (
          <span className="ml-1 text-xs font-sans text-muted-foreground font-semibold">
            {metric.unit}
          </span>
        )}
      </p>
      {metric.trend && <TrendIcon trend={metric.trend} />}
    </div>
    {metric.trendValue !== undefined && metric.trendValue !== null && (
      <p className="text-[10px] font-mono text-muted-foreground">
        {metric.trendValue > 0 ? "+" : ""}{metric.trendValue}% vs last cycle
      </p>
    )}
  </div>
);

const AdvancedAnalytics = () => {
  const [budgetPool, setBudgetPool] = useState<DepartmentBudgetPool | null>(null);
  const [seasonal, setSeasonal] = useState<SeasonalAdjustment | null>(null);
  const [kpiDashboard, setKpiDashboard] = useState<CustomKpiDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      const [poolRes, seasonalRes, kpiRes] = await Promise.all([
        analyticsService.getDepartmentBudgetPool(),
        analyticsService.getSeasonalAdjustments(),
        analyticsService.getKpiDashboard(),
      ]);

      if (poolRes.success && poolRes.data) setBudgetPool(poolRes.data);
      if (seasonalRes.success && seasonalRes.data) setSeasonal(seasonalRes.data);
      if (kpiRes.success && kpiRes.data) setKpiDashboard(kpiRes.data);

      const firstError = [poolRes, seasonalRes, kpiRes].find((r) => !r.success);
      if (firstError) setError(firstError.error || "Failed to load financial telemetry");
      setIsLoading(false);
    };
    fetchAll();
  }, []);

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
      <div className="space-y-5 max-w-7xl mx-auto font-sans">
        {/* Header Ribbon */}
        <div className="border-b border-border/80 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Financial Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Department budget pooling, seasonal spending adjustments, and multi-dimensional finance KPIs.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="kpi" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="kpi" className="gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" /> KPI Dashboard
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5 text-xs">
              <BarChart2 className="h-3.5 w-3.5" /> Department Pools
            </TabsTrigger>
            <TabsTrigger value="seasonal" className="gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5" /> Seasonal Analysis
            </TabsTrigger>
          </TabsList>

          {/* ── KPI Dashboard ── */}
          <TabsContent value="kpi" className="space-y-5 mt-0">
            {kpiDashboard ? (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Spending Velocity
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {kpiDashboard.spendKpis.map((m) => (
                      <KpiCard key={m.name} metric={m} />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Anomaly & Risk Indicators
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {kpiDashboard.riskKpis.map((m) => (
                      <KpiCard key={m.name} metric={m} />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Governance & Compliance Safeguards
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {kpiDashboard.complianceKpis.map((m) => (
                      <KpiCard key={m.name} metric={m} />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Operational Turnaround SLA
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {kpiDashboard.efficiencyKpis.map((m) => (
                      <KpiCard key={m.name} metric={m} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No KPI data available.</p>
            )}
          </TabsContent>

          {/* ── Department Budget Pool ── */}
          <TabsContent value="departments" className="space-y-4 mt-0">
            {budgetPool ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pooled Budget
                    </p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      ${budgetPool.totalBudget.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Aggregate Spend
                    </p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      ${budgetPool.totalSpend.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Remaining Surplus
                    </p>
                    <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                      ${budgetPool.totalRemaining.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Utilization
                    </p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      {budgetPool.overallUtilizationPercent}%
                    </p>
                  </div>
                </div>

                {budgetPool.overBudgetDepartments.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Budget overruns detected in: <strong className="font-mono uppercase">{budgetPool.overBudgetDepartments.join(", ")}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Department Details Table / Cards */}
                <Card>
                  <CardHeader className="border-b border-border/60 pb-3">
                    <CardTitle>Department Pool Allocation Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {budgetPool.departments.map((dept) => (
                      <div
                        key={dept.departmentName}
                        className="rounded-md border border-border bg-card p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">
                            {dept.departmentName}
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            ${dept.currentSpend.toLocaleString()} / ${dept.allocatedBudget.toLocaleString()} ({dept.utilizationPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${
                              dept.isOverBudget
                                ? "bg-destructive"
                                : dept.utilizationPercent > 80
                                ? "bg-amber-500"
                                : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(dept.utilizationPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* ── Seasonal Patterns ── */}
          <TabsContent value="seasonal" className="space-y-4 mt-0">
            {seasonal ? (
              <Card>
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle>Seasonal Spend Variations</CardTitle>
                  <CardDescription>Historical pattern indices for budget smoothing</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={seasonal.monthlyIndices}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "11px",
                        }}
                      />
                      <ReferenceLine y={1.0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="Baseline (1.0)" />
                      <Line
                        type="monotone"
                        dataKey="index"
                        name="Seasonality Index"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdvancedAnalytics;
