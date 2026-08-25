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
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  TimerReset,
  ShieldAlert,
  Download,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
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
      setError("Failed to export CSV ledger.");
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
      setError(`Failed to export ${format === "quickbooks" ? "QuickBooks" : "Xero"} payload.`);
    } finally {
      setIsExporting(false);
    }
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

  if (!insights) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-lg mx-auto py-12 text-center">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "No insight telemetry available"}</AlertDescription>
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
  const maxPolicyTriggerCount = Math.max(...insights.topPolicyTriggers.map((item) => item.count), 1);

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto font-sans">
        {/* Header Ribbon */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Manager Insights</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reviewer turnaround, recurring anomalies, and 1-click accounting sync.
            </p>
          </div>

          {/* Export and Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodMonths} onValueChange={setPeriodMonths}>
              <SelectTrigger className="h-8 w-32 text-xs bg-background">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="1">Last 1 month</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="xs"
              variant="default"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="gap-1.5 font-bold"
            >
              {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              CSV Export
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleAccountingExport("quickbooks")}
              disabled={isExporting}
              className="gap-1.5 font-medium"
            >
              QuickBooks
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleAccountingExport("xero")}
              disabled={isExporting}
              className="gap-1.5 font-medium"
            >
              Xero
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Primary Metric KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Approved Volume
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {insights.approvedCount} claims
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rejected Volume
            </p>
            <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400 font-mono">
              {insights.rejectedCount} claims
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Flagged Risk Claims
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {insights.flaggedCount} ({insights.highRiskCount} high)
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Turnaround SLA
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {insights.turnaround.averageDecisionHours}h avg
            </p>
          </div>
        </div>

        {/* Operational Intelligence Strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SLA Breach Rate
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {insights.operationalKpis.slaBreachRate}%
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {insights.operationalKpis.slaBreachedDecisions} / {insights.operationalKpis.totalDecisions} over 48h SLA
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Model Calibration Accuracy
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {insights.learningMetrics.currentConfidenceScore}%
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {insights.learningMetrics.feedbackCount} reviewer calibrations
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              False Positive Rate
            </p>
            <p className="mt-1 text-lg font-bold text-foreground font-mono">
              {insights.learningMetrics.falsePositiveRate}%
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {insights.learningMetrics.falsePositiveCount} false positive corrections
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Trend Line Chart */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Risk Trend vs Policy Triggers</CardTitle>
              <CardDescription>Monthly volume of high risk claims against policy rule hits</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={mergedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Line
                    type="monotone"
                    dataKey="highRiskCount"
                    name="High Risk"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="triggeredCount"
                    name="Policy Triggers"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rejection Reasons Bar Chart */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Top Rejection Justifications</CardTitle>
              <CardDescription>Most frequent compliance and manager refusal reasons</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {insights.topRejectionReasons.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
                  No rejection records in selected window.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={insights.topRejectionReasons} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="reason" type="category" width={110} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Policy Opportunities & Filer Behavior */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Policy Opportunities */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Policy Optimization Opportunities</CardTitle>
              <CardDescription>Actionable adjustments to eliminate expense leakage</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              {insights.policyRecommendations.map((item) => (
                <div key={item.title} className="rounded-md border border-border bg-card p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{item.title}</span>
                    <Badge variant="success" className="font-mono">
                      +${Math.round(item.estimatedSavings)}/yr
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{item.recommendation}</p>
                  <p className="text-[10px] font-mono text-muted-foreground pt-1">{item.benchmark}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Policy Rule Hits */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Top Policy Rule Triggers</CardTitle>
              <CardDescription>Most frequently breached organizational guardrails</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {insights.topPolicyTriggers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No triggers recorded yet.</p>
              ) : (
                insights.topPolicyTriggers.slice(0, 4).map((item) => (
                  <div key={item.trigger} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{item.trigger}</span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {item.count} hits
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max((item.count / maxPolicyTriggerCount) * 100, 6)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerInsights;
