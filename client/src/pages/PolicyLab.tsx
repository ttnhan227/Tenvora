import React, { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { settingsService, PolicySimulationResult } from "@/services/settingsService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Bot,
  Clock3,
  FlaskConical,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Play,
} from "lucide-react";

const PolicyLab = () => {
  const [enabled, setEnabled] = useState(true);
  const [maxAmount, setMaxAmount] = useState(250);
  const [maxRiskScore, setMaxRiskScore] = useState(30);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [result, setResult] = useState<PolicySimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const simulate = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await settingsService.simulatePolicy({
      enabled,
      maxAmount,
      maxRiskScore,
      excludeWeekends,
      excludedCategories: ["Entertainment", "Equipment"],
    });
    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error || "Unable to complete simulation calculation");
    }
    setLoading(false);
  }, [enabled, maxAmount, maxRiskScore, excludeWeekends]);

  useEffect(() => {
    void simulate();
  }, [simulate]);

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "Auto-approve":
        return <Badge variant="success">Auto-approve</Badge>;
      case "Escalate":
        return <Badge variant="destructive">Escalate</Badge>;
      default:
        return <Badge variant="warning">{outcome}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-6xl mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Policy Simulation Lab</h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                Sandbox Mode
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Replay proposed threshold changes against historical ledger claims without impacting active policies.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-start">
          {/* Simulation Controls Panel Column */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle>Simulation Parameters</CardTitle>
              <CardDescription>Adjust rules to project ledger automation</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-sim" className="text-xs font-semibold cursor-pointer">
                  Enable Automation
                </Label>
                <Switch id="enable-sim" checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground">
                  Auto-Approval Cap ($)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(Number(e.target.value))}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="risk" className="text-xs font-semibold text-muted-foreground">
                  Max Risk Score Limit (0–100)
                </Label>
                <Input
                  id="risk"
                  type="number"
                  min={0}
                  max={100}
                  value={maxRiskScore}
                  onChange={(e) => setMaxRiskScore(Number(e.target.value))}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="weekends" className="text-xs font-semibold cursor-pointer">
                  Flag Weekend Claims
                </Label>
                <Switch id="weekends" checked={excludeWeekends} onCheckedChange={setExcludeWeekends} />
              </div>

              <div className="rounded-md bg-muted/20 border border-border p-2.5 text-[11px] text-muted-foreground">
                Note: Entertainment & Equipment claims are permanently routed to manager review.
              </div>

              <Button
                className="w-full gap-1.5 font-bold"
                variant="signal"
                size="xs"
                onClick={simulate}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run Impact Simulation
              </Button>
            </CardContent>
          </Card>

          {/* POS Card Preview Card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="relative h-36 bg-slate-900 overflow-hidden">
              <img
                src="/corporate-card-pay.jpg"
                alt="Corporate Card Swipe Simulator"
                className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                <span className="text-xs font-semibold text-emerald-400">
                  Instant Card Policy Sync
                </span>
                <span className="text-[10px] bg-slate-900/80 px-2 py-0.5 rounded border border-white/20">
                  Corporate Card (•••• 4092)
                </span>
              </div>
            </div>
            <div className="p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground text-xs">Live Card Safeguards</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Rules tested here sync automatically to corporate cards and prevent out-of-policy spend in real time.
              </p>
            </div>
          </div>
        </div>

          {/* Results Column */}
          <div className="space-y-4">
            {/* Projected Impact Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-border bg-card p-3 space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Automation</p>
                <p className="text-xl font-bold font-mono text-foreground">{result?.automationRate ?? 0}%</p>
                <p className="text-[10px] text-muted-foreground">Auto-processed</p>
              </div>

              <div className="rounded-md border border-border bg-card p-3 space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Auto-Approved</p>
                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {result?.autoApproveCount ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Claims cleared</p>
              </div>

              <div className="rounded-md border border-border bg-card p-3 space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Escalated</p>
                <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                  {result?.escalateCount ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Manager review</p>
              </div>

              <div className="rounded-md border border-border bg-card p-3 space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Hours Saved</p>
                <p className="text-xl font-bold font-mono text-foreground">
                  {result?.reviewHoursSaved ?? 0}h
                </p>
                <p className="text-[10px] text-muted-foreground">Reviewer time</p>
              </div>
            </div>

            {/* Replay Ledger Sample Table */}
            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Historical Replay Sample</CardTitle>
                  <span className="font-mono text-xs text-muted-foreground font-semibold">
                    {result?.evaluatedCount ?? 0} claims evaluated
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-1.5">
                  {result?.expenses.slice(0, 10).map((exp) => (
                    <div
                      key={exp.expenseId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5 text-xs hover:bg-muted/10 transition-colors"
                    >
                      <div className="min-w-[180px]">
                        <span className="font-bold text-foreground">{exp.merchant}</span>
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          {exp.category} • ${exp.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Score: <strong>{exp.riskScore}%</strong>
                        </span>
                        {getOutcomeBadge(exp.outcome)}
                      </div>

                      <span className="text-[11px] text-muted-foreground truncate max-w-xs block">
                        {exp.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PolicyLab;
