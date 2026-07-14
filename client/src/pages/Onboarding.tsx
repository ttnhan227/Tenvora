import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { settingsService } from "@/services/settingsService";
import { adminUserService } from "@/services/adminUserService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Check, ChevronRight, Loader2, ReceiptText, ShieldCheck, Users } from "lucide-react";

const steps = ["Company policy", "Budgets & automation", "Team & first expense"];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [policy, setPolicy] = useState({ maxSpendLimit: "1000", policyNotes: "Receipts are required for reimbursable expenses." });
  const [budgets, setBudgets] = useState({ Travel: "5000", Meals: "2000", Software: "3000", Equipment: "5000" });
  const [automation, setAutomation] = useState(true);
  const [managerEmail, setManagerEmail] = useState("");

  const next = async () => {
    setSaving(true); setError("");
    try {
      if (step === 0) {
        const response = await settingsService.updatePolicy({ maxSpendLimit: Number(policy.maxSpendLimit), policyNotes: policy.policyNotes });
        if (!response.success) throw new Error(response.error);
      }
      if (step === 1) {
        const budgetResponse = await settingsService.updateCategoryBudgets(Object.fromEntries(Object.entries(budgets).map(([key, value]) => [key, Number(value)])));
        if (!budgetResponse.success) throw new Error(budgetResponse.error);
        const rulesResponse = await settingsService.updateAutoApprovalRules({ enabled: automation, maxAmount: 100, maxRiskScore: 20, excludeWeekends: true, excludedCategories: ["Entertainment", "Equipment"], minAgeHours: 12 });
        if (!rulesResponse.success) throw new Error(rulesResponse.error);
      }
      if (step === 2) {
        if (managerEmail.trim()) {
          const inviteResponse = await adminUserService.inviteUser({ email: managerEmail.trim(), role: "Manager" });
          if (!inviteResponse.success) throw new Error(inviteResponse.error);
        }
        localStorage.setItem(`verispend-onboarding-${user?.tenantId}`, "complete");
        navigate("/upload"); return;
      }
      setStep(current => current + 1);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Setup could not be saved.");
    } finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-background px-4 py-10">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ShieldCheck className="h-6 w-6"/></div><div><p className="font-bold">VeriSpend</p><p className="text-xs text-muted-foreground">Organization setup</p></div></div><span className="text-xs text-muted-foreground">{user?.companyName}</span></div>
      <div className="mb-8 grid gap-2 md:grid-cols-3">{steps.map((label, index) => <div key={label} className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-semibold ${index === step ? "border-primary bg-primary/5 text-primary" : index < step ? "border-primary/20 text-foreground" : "border-border text-muted-foreground"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${index <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{index < step ? <Check className="h-3.5 w-3.5"/> : index + 1}</span>{label}</div>)}</div>
      <Card className="rounded-3xl shadow-xl"><CardContent className="p-7 md:p-10">
        {step === 0 && <div className="space-y-6"><div><Building2 className="mb-4 h-7 w-7 text-primary"/><h1 className="text-2xl font-bold">Define your company controls</h1><p className="mt-2 text-sm text-muted-foreground">These rules become the baseline for risk scoring and manager review.</p></div><div className="space-y-2"><Label>Expense review threshold (USD)</Label><Input type="number" value={policy.maxSpendLimit} onChange={e => setPolicy({...policy,maxSpendLimit:e.target.value})}/></div><div className="space-y-2"><Label>Expense policy</Label><Textarea rows={5} value={policy.policyNotes} onChange={e => setPolicy({...policy,policyNotes:e.target.value})} placeholder="Describe receipt, travel, meal, and approval requirements..."/></div></div>}
        {step === 1 && <div className="space-y-6"><div><ShieldCheck className="mb-4 h-7 w-7 text-primary"/><h1 className="text-2xl font-bold">Set budgets and safe automation</h1><p className="mt-2 text-sm text-muted-foreground">Start with your real operating limits. You can change them later.</p></div><div className="grid gap-4 sm:grid-cols-2">{Object.entries(budgets).map(([category,value]) => <div key={category} className="space-y-2"><Label>{category} budget</Label><Input type="number" value={value} onChange={e => setBudgets({...budgets,[category]:e.target.value})}/></div>)}</div><div className="flex items-center justify-between rounded-2xl border border-border p-4"><div><p className="text-sm font-semibold">Low-risk auto-approval</p><p className="mt-1 text-xs text-muted-foreground">Automatically approve claims under $100 with a risk score below 20.</p></div><Switch checked={automation} onCheckedChange={setAutomation}/></div></div>}
        {step === 2 && <div className="space-y-6"><div><Users className="mb-4 h-7 w-7 text-primary"/><h1 className="text-2xl font-bold">Invite finance and add real data</h1><p className="mt-2 text-sm text-muted-foreground">Optionally invite a manager, then upload your first receipt to activate the workspace.</p></div><div className="space-y-2"><Label>Finance manager email (optional)</Label><Input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="finance@company.com"/></div><div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><ReceiptText className="mb-3 h-6 w-6 text-primary"/><p className="font-semibold">Next: upload your first company receipt</p><p className="mt-1 text-xs text-muted-foreground">VeriSpend will extract its fields, assess risk, and create the first real audit event.</p></div></div>}
        {error && <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
        <div className="mt-8 flex items-center justify-between"><Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>Back</Button><Button onClick={next} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}{step === 2 ? "Continue to receipt upload" : "Save and continue"}<ChevronRight className="ml-2 h-4 w-4"/></Button></div>
      </CardContent></Card>
    </div>
  </div>;
};
export default Onboarding;
