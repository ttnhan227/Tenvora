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
import { AlertTriangle, Bot, Clock3, FlaskConical, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

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
      setError(response.error || "Unable to run simulation");
    }
    setLoading(false);
  }, [enabled, maxAmount, maxRiskScore, excludeWeekends]);

  useEffect(() => {
    void simulate();
  }, [simulate]);

  const getOutcomeBadge = (outcome: string) => {
    if (outcome === "Auto-approve") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] rounded font-medium">
          Auto-approve
        </Badge>
      );
    }
    if (outcome === "Escalate") {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] rounded font-medium">
          Escalate
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] rounded font-medium">
        {outcome}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl font-sans">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Policy Simulation Lab</h1>
            <p className="text-xs text-muted-foreground">
              Replay proposed guardrails against historical organization claims in sandbox mode without affecting live policies.
            </p>
          </div>
          <Badge variant="outline" className="border-border text-muted-foreground text-xs h-7 self-start md:self-auto">
            Read-only simulation
          </Badge>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Controls Card */}
          <Card className="h-fit rounded-xl border border-border bg-card">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Proposed Rules</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Adjust variables to test impact</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-sim" className="text-xs font-medium cursor-pointer">Enable Automation</Label>
                <Switch id="enable-sim" checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-medium">Auto-approval Max Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(Number(e.target.value))}
                  className="bg-background border-border text-xs rounded-lg h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="risk" className="text-xs font-medium">Max Risk Score Threshold (0–100)</Label>
                <Input
                  id="risk"
                  type="number"
                  min={0}
                  max={100}
                  value={maxRiskScore}
                  onChange={(e) => setMaxRiskScore(Number(e.target.value))}
                  className="bg-background border-border text-xs rounded-lg h-9 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="weekends" className="text-xs font-medium cursor-pointer">Block Weekend Claims</Label>
                <Switch id="weekends" checked={excludeWeekends} onCheckedChange={setExcludeWeekends} />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-border">
                Equipment and Entertainment categories are permanently excluded from auto-approval.
              </div>

              <Button
                className="w-full gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs shadow-sm"
                onClick={simulate}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                Run Impact Simulation
              </Button>
            </CardContent>
          </Card>

          {/* Results column */}
          <div className="space-y-6">
            {/* KPI metrics */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-4">
                  <Bot className="mb-2 h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold text-foreground font-mono">{result?.automationRate ?? 0}%</div>
                  <p className="text-xs text-muted-foreground">Automation Rate</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-4">
                  <ShieldCheck className="mb-2 h-4 w-4 text-emerald-500" />
                  <div className="text-2xl font-bold text-foreground font-mono">{result?.autoApproveCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Auto-approved</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-4">
                  <AlertTriangle className="mb-2 h-4 w-4 text-amber-500" />
                  <div className="text-2xl font-bold text-foreground font-mono">{result?.escalateCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Escalated</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-4">
                  <Clock3 className="mb-2 h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold text-foreground font-mono">{result?.reviewHoursSaved ?? 0}h</div>
                  <p className="text-xs text-muted-foreground">Review Hours Saved</p>
                </CardContent>
              </Card>
            </div>

            {/* Preview table */}
            <Card className="rounded-xl border border-border bg-card overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="text-sm font-bold text-foreground">Simulation Evaluation Sample</CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-mono">{result?.evaluatedCount ?? 0} historical claims replayed</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {result?.expenses.slice(0, 12).map((expense) => (
                  <div
                    key={expense.expenseId}
                    className="grid gap-2 rounded-lg border border-border bg-muted/10 p-3 text-xs md:grid-cols-[1.2fr_.6fr_.6fr_1fr] md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{expense.merchant}</p>
                      <p className="text-[11px] text-muted-foreground">{expense.category} · ${expense.amount.toLocaleString()}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">Score {expense.riskScore}%</span>
                    <div>{getOutcomeBadge(expense.outcome)}</div>
                    <span className="text-[11px] text-muted-foreground truncate">{expense.reason}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PolicyLab;
