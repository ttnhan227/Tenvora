import React, { useEffect, useState } from "react";
import { managerService, AuditInsight } from "@/services/managerService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, ShieldCheck, TimerReset, ShieldAlert, Download, AlertTriangle, ArrowUpRight } from "lucide-react";
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
  Legend,
} from "recharts";

const ManagerInsights = () => {
  const [insights, setInsights] = useState<AuditInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [periodMonths, setPeriodMonths] = useState("6");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInsights = async () => {
      const result = await managerService.getAuditInsights();
      if (result.success && result.data) {
        setInsights(result.data);
      } else {
        setError(result.error || "Failed to load manager insights");
      }
      setIsLoading(false);
    };

    fetchInsights();
  }, []);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await managerService.exportExpenses();
      downloadBlob(blob, `tenant-expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      setError("Failed to export CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAccountingExport = async (format: "quickbooks" | "xero") => {
    try {
      setIsExporting(true);
      const blob = format === "quickbooks"
        ? await managerService.exportQuickBooks()
        : await managerService.exportXero();
      downloadBlob(blob, `${format}-export-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      setError(`Failed to export ${format === "quickbooks" ? "QuickBooks" : "Xero"} file.`);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!insights) {
    return (
      <DashboardLayout>
        <div className="space-y-6 font-sans">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manager Insights</h1>
            <p className="text-xs text-muted-foreground">Spend analytics and policy performance trends.</p>
          </div>

          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error || "No insight data available."}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const monthWindow = Number(periodMonths);
  const filteredRiskTrend = insights.monthlyHighRiskTrend.slice(-monthWindow);
  const filteredPolicyTriggerTrend = insights.monthlyPolicyTriggerTrend.slice(-monthWindow);
  const mergedTrendData = filteredRiskTrend.map((riskPoint, index) => ({
    ...riskPoint,
    triggeredCount: filteredPolicyTriggerTrend[index]?.triggeredCount ?? 0,
  }));
  const windowTotals = mergedTrendData.reduce(
    (acc, point) => {
      acc.highRisk += point.highRiskCount;
      acc.reviewed += point.reviewedCount;
      acc.triggers += point.triggeredCount;
      return acc;
    },
    { highRisk: 0, reviewed: 0, triggers: 0 }
  );
  const maxPolicyTriggerCount = Math.max(...insights.topPolicyTriggers.map((item) => item.count), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6 font-sans">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manager Insights</h1>
            <p className="text-xs text-muted-foreground">
              Spend analytics, policy triggers, and reviewer turnaround metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodMonths} onValueChange={setPeriodMonths}>
              <SelectTrigger className="w-36 bg-background border-border text-foreground text-xs rounded-lg h-9">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                <SelectItem value="1">Last 1 month</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportCsv} disabled={isExporting} className="rounded-lg px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground h-9 gap-1.5 shadow-sm">
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export CSV
            </Button>
            <Button onClick={() => handleAccountingExport("quickbooks")} disabled={isExporting} variant="outline" className="rounded-lg px-3 text-xs font-medium border-border hover:bg-muted text-foreground h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              QuickBooks
            </Button>
            <Button onClick={() => handleAccountingExport("xero")} disabled={isExporting} variant="outline" className="rounded-lg px-3 text-xs font-medium border-border hover:bg-muted text-foreground h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Xero
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* First Row Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claims Approved</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.approvedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cleared transactions</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claims Rejected</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-red-500 font-mono">{insights.rejectedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Policy violations</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flagged Claims</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.flaggedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">High risk: <span className="text-red-500 font-semibold">{insights.highRiskCount}</span></p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision Speed</CardTitle>
              <TimerReset className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.turnaround.averageDecisionHours}h</p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg turnaround: {insights.turnaround.averageApprovalHours}h</p>
            </CardContent>
          </Card>
        </div>

        {/* Operational KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SLA Breach Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.operationalKpis.slaBreachRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {insights.operationalKpis.slaBreachedDecisions}/{insights.operationalKpis.totalDecisions} claims over 48h SLA
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escalation Rate</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.operationalKpis.escalationRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insights.operationalKpis.escalationCount} claims routed to senior managers</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Window Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0 text-xs text-foreground space-y-1">
              <p>High Risk: <span className="font-semibold font-mono text-red-500">{windowTotals.highRisk}</span></p>
              <p>Reviewed: <span className="font-semibold font-mono text-foreground">{windowTotals.reviewed}</span></p>
              <p>Rule Triggers: <span className="font-semibold font-mono text-amber-500">{windowTotals.triggers}</span></p>
            </CardContent>
          </Card>
        </div>

        {/* Feedback / Evaluation Model Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classification Accuracy</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-primary font-mono">{insights.learningMetrics.currentConfidenceScore}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {insights.learningMetrics.confidenceTrendPercentage >= 0 ? "+" : ""}
                {insights.learningMetrics.confidenceTrendPercentage}% trend this month
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Manager Overrides</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.learningMetrics.feedbackCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insights.learningMetrics.falsePositiveCount} false positive corrections</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">False Positive Rate</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <p className="text-2xl font-bold text-foreground font-mono">{insights.learningMetrics.falsePositiveRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insights.learningMetrics.autoApprovalFalsePositiveCount} auto-approved false alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations & Filer Behavior */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Policy Optimization Opportunities</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Estimated savings derived from spending patterns.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {insights.policyRecommendations.map((item) => (
                  <div key={item.title} className="rounded-lg border border-border bg-muted/20 p-3.5 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-muted-foreground leading-relaxed">{item.recommendation}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono rounded shrink-0">
                        +${Math.round(item.estimatedSavings)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[10px] text-primary font-mono">{item.benchmark}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Recurring Infraction Patterns</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Filer behaviors that trigger review delays.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {insights.employeeBehaviorInsights.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">No recurring anomalies flagged.</p>
              ) : (
                <div className="space-y-3">
                  {insights.employeeBehaviorInsights.map((item) => (
                    <div key={`${item.employeeEmail}-${item.insight}`} className="rounded-lg border border-border bg-muted/20 p-3.5 text-xs">
                      <p className="font-semibold text-foreground break-all font-mono">{item.employeeEmail}</p>
                      <p className="mt-1 text-muted-foreground leading-relaxed">{item.insight}</p>
                      <p className="mt-2 text-[10px] text-primary font-semibold">{item.nudge}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Rule Breaches vs High Risk Rating</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Historical trend showing risky claims vs policy triggers.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mergedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="monthLabel" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="highRiskCount" name="High Risk Claims" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="triggeredCount" name="Rule Triggers" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Top Rejection Reasons</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Most common refusal justifications recorded.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {insights.topRejectionReasons.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No rejection records in period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={insights.topRejectionReasons} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="reason" type="category" width={100} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trigger Leaderboard & Frequent Infraction Filer */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-xl border border-border bg-card overflow-hidden lg:col-span-2">
            <CardHeader className="border-b border-border px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground">Top Policy Rule Triggers</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-6">
              {insights.topPolicyTriggers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No triggers recorded yet.</p>
              ) : (
                <div className="space-y-3.5">
                  {insights.topPolicyTriggers.slice(0, 4).map((item) => (
                    <div key={item.trigger} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-foreground">{item.trigger}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">{item.count} hits</Badge>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted border border-border">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max((item.count / maxPolicyTriggerCount) * 100, 6)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Frequent Infraction Filers</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Employees with highest flag rates.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {insights.highestFlagRateEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {insights.highestFlagRateEmployees.slice(0, 3).map((employee) => (
                    <div key={employee.employeeEmail} className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                      <p className="font-semibold text-foreground break-all font-mono">{employee.employeeEmail}</p>
                      <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                        {employee.flaggedCount}/{employee.expenseCount} flagged ({employee.flagRate}%)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerInsights;
