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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Check,
  ChevronRight,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Users,
  AlertCircle,
} from "lucide-react";

const steps = ["Company Policy", "Category Budgets & Automation", "Finance Reviewer Setup"];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [policy, setPolicy] = useState({
    maxSpendLimit: "1000",
    policyNotes: "Itemized receipts are required for all reimbursable business expenses.",
  });
  const [budgets, setBudgets] = useState({
    Travel: "5000",
    Meals: "2000",
    Software: "3000",
    Equipment: "5000",
  });
  const [automation, setAutomation] = useState(true);
  const [managerEmail, setManagerEmail] = useState("");

  const next = async () => {
    setSaving(true);
    setError("");
    try {
      if (step === 0) {
        const response = await settingsService.updatePolicy({
          maxSpendLimit: Number(policy.maxSpendLimit),
          policyNotes: policy.policyNotes,
        });
        if (!response.success) throw new Error(response.error);
      }
      if (step === 1) {
        const budgetResponse = await settingsService.updateCategoryBudgets(
          Object.fromEntries(
            Object.entries(budgets).map(([key, value]) => [key, Number(value)])
          )
        );
        if (!budgetResponse.success) throw new Error(budgetResponse.error);

        const rulesResponse = await settingsService.updateAutoApprovalRules({
          enabled: automation,
          maxAmount: 100,
          maxRiskScore: 20,
          excludeWeekends: true,
          excludedCategories: ["Entertainment", "Equipment"],
          minAgeHours: 12,
        });
        if (!rulesResponse.success) throw new Error(rulesResponse.error);
      }
      if (step === 2) {
        if (managerEmail.trim()) {
          const inviteResponse = await adminUserService.inviteUser({
            email: managerEmail.trim(),
            role: "Manager",
          });
          if (!inviteResponse.success) throw new Error(inviteResponse.error);
        }
        localStorage.setItem(`verispend-onboarding-${user?.tenantId}`, "complete");
        navigate("/upload");
        return;
      }
      setStep((current) => current + 1);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Setup could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans text-xs">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Workspace Brand Bar */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
            <span className="font-bold text-sm text-foreground">VeriSpend Setup</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground font-semibold">
            {user?.companyName}
          </span>
        </div>

        {/* Step Progress Pills */}
        <div className="grid gap-2 sm:grid-cols-3">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-md border p-2.5 text-xs font-semibold ${
                index === step
                  ? "border-primary bg-primary/5 text-foreground"
                  : index < step
                  ? "border-border bg-card text-foreground"
                  : "border-border/60 bg-muted/20 text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono ${
                  index < step
                    ? "bg-emerald-600 text-white"
                    : index === step
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < step ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Wizard Card */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            {step === 0 && (
              <>
                <CardTitle>Define Corporate Spend Policy</CardTitle>
                <CardDescription>
                  Set the threshold that triggers mandatory manager review
                </CardDescription>
              </>
            )}
            {step === 1 && (
              <>
                <CardTitle>Category Budgets & Automation</CardTitle>
                <CardDescription>
                  Establish monthly caps and configure auto-approval safety rules
                </CardDescription>
              </>
            )}
            {step === 2 && (
              <>
                <CardTitle>Finance Manager & Ingestion</CardTitle>
                <CardDescription>
                  Invite your reviewer and test the first OCR extraction
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {step === 0 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="spendLimit" className="text-xs font-semibold text-muted-foreground">
                    Expense Review Threshold ($)
                  </Label>
                  <Input
                    id="spendLimit"
                    type="number"
                    value={policy.maxSpendLimit}
                    onChange={(e) => setPolicy({ ...policy, maxSpendLimit: e.target.value })}
                    className="font-mono text-xs max-w-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Transactions exceeding this value require explicit approval before payment.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="policyNotes" className="text-xs font-semibold text-muted-foreground">
                    Expense Guidelines & Rules
                  </Label>
                  <Textarea
                    id="policyNotes"
                    rows={4}
                    value={policy.policyNotes}
                    onChange={(e) => setPolicy({ ...policy, policyNotes: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(budgets).map(([category, value]) => (
                    <div key={category} className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        {category} Budget ($/mo)
                      </Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => setBudgets({ ...budgets, [category]: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Safe Auto-Approval Engine</p>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-approve low-risk expenses under $100 with zero policy flags
                    </p>
                  </div>
                  <Switch checked={automation} onCheckedChange={setAutomation} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="mgrEmail" className="text-xs font-semibold text-muted-foreground">
                    Finance Manager Email (Optional)
                  </Label>
                  <Input
                    id="mgrEmail"
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="finance@company.com"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="rounded-md border border-border bg-muted/10 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ReceiptText className="h-4 w-4" /> Next Step: Ingest First Receipt
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Upload an itemized receipt image to test OCR field extraction, policy risk scoring, and tamper-evident audit logging in real-time.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="ghost"
                size="xs"
                disabled={step === 0 || saving}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <Button
                onClick={next}
                disabled={saving}
                size="xs"
                variant={step === 2 ? "signal" : "default"}
                className="font-bold gap-1"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {step === 2 ? "Upload First Receipt" : "Continue"}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
