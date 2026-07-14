import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { settingsService, PolicySimulationResult } from "@/services/settingsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bot, Clock3, FlaskConical, Loader2, ShieldCheck } from "lucide-react";

const PolicyLab = () => {
  const [enabled, setEnabled] = useState(true);
  const [maxAmount, setMaxAmount] = useState(250);
  const [maxRiskScore, setMaxRiskScore] = useState(30);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [result, setResult] = useState<PolicySimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const simulate = useCallback(async () => {
    setLoading(true); setError("");
    const response = await settingsService.simulatePolicy({ enabled, maxAmount, maxRiskScore, excludeWeekends, excludedCategories: ["Entertainment", "Equipment"] });
    if (response.success && response.data) setResult(response.data);
    else setError(response.error || "Unable to run simulation");
    setLoading(false);
  }, [enabled, maxAmount, maxRiskScore, excludeWeekends]);
  useEffect(() => { void simulate(); }, [simulate]);

  return <DashboardLayout><div className="space-y-6">
    <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><FlaskConical className="h-4 w-4" /> Policy impact laboratory</div>
        <h1 className="text-3xl font-extrabold tracking-tight">Test controls before publishing</h1><p className="mt-2 text-sm text-muted-foreground">Replay proposed guardrails against up to 100 real claims without changing production policy.</p></div>
        <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">Read-only simulation</Badge>
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit rounded-3xl"><CardHeader><CardTitle className="text-base">Proposed guardrails</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="flex items-center justify-between"><Label>Enable automation</Label><Switch checked={enabled} onCheckedChange={setEnabled} /></div>
        <div className="space-y-2"><Label htmlFor="amount">Automatic approval ceiling</Label><Input id="amount" type="number" value={maxAmount} onChange={e => setMaxAmount(Number(e.target.value))} /></div>
        <div className="space-y-2"><Label htmlFor="risk">Maximum risk score (0–100)</Label><Input id="risk" type="number" min={0} max={100} value={maxRiskScore} onChange={e => setMaxRiskScore(Number(e.target.value))} /></div>
        <div className="flex items-center justify-between"><Label>Block weekend automation</Label><Switch checked={excludeWeekends} onCheckedChange={setExcludeWeekends} /></div>
        <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Equipment and Entertainment remain human-review categories.</div>
        <Button className="w-full" onClick={simulate} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}Run impact simulation</Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent></Card>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{label:"Automation rate",value:`${result?.automationRate ?? 0}%`,icon:Bot},{label:"Auto-approved",value:result?.autoApproveCount ?? 0,icon:ShieldCheck},{label:"Escalated",value:result?.escalateCount ?? 0,icon:AlertTriangle},{label:"Review hours saved",value:result?.reviewHoursSaved ?? 0,icon:Clock3}].map(item => <Card key={item.label} className="rounded-2xl"><CardContent className="p-5"><item.icon className="mb-4 h-5 w-5 text-primary"/><div className="text-2xl font-black">{item.value}</div><p className="mt-1 text-xs text-muted-foreground">{item.label}</p></CardContent></Card>)}
        </div>
        <Card className="rounded-3xl"><CardHeader><CardTitle className="text-base">Decision preview · {result?.evaluatedCount ?? 0} claims evaluated</CardTitle></CardHeader><CardContent className="space-y-2">
          {result?.expenses.slice(0, 12).map(expense => <div key={expense.expenseId} className="grid gap-2 rounded-xl border border-border p-4 text-sm md:grid-cols-[1.2fr_.7fr_.5fr_1fr] md:items-center"><div><p className="font-semibold">{expense.merchant}</p><p className="text-xs text-muted-foreground">{expense.category} · ${expense.amount.toLocaleString()}</p></div><span className="font-mono text-xs">Risk {expense.riskScore}</span><Badge className={expense.outcome === "Auto-approve" ? "bg-emerald-500/10 text-emerald-600" : expense.outcome === "Escalate" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-700"} variant="outline">{expense.outcome}</Badge><span className="text-xs text-muted-foreground">{expense.reason}</span></div>)}
        </CardContent></Card>
      </div>
    </div>
  </div></DashboardLayout>;
};
export default PolicyLab;
