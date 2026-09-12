import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceAiInsight } from "@/components/assistant/WorkspaceAiInsight";
import {
  taxService,
  TaxSummary,
} from "@/services/taxService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Calendar,
  ArrowRightLeft,
  Percent,
  CheckCircle,
  Clock,
  AlertCircle,
  Lock,
  ArrowDownRight,
} from "lucide-react";

export const TaxesHub: React.FC = () => {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Settings state
  const [taxRate, setTaxRate] = useState<number>(25);
  const [autoTaxEnabled, setAutoTaxEnabled] = useState<boolean>(false);
  const [filingStatus, setFilingStatus] = useState<string>("Single");
  const [savingSettings, setSavingSettings] = useState(false);

  // Transfer Modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDirection, setTransferDirection] = useState<"ToTaxVault" | "ToSpendingWallet">("ToTaxVault");
  const [transferAmount, setTransferAmount] = useState<string>("500");
  const [transferring, setTransferring] = useState(false);

  const formatMoney = (amount: number, currency = summary?.currency || "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await taxService.getTaxSummary();
      setSummary(data);
      setTaxRate(data.defaultTaxRatePercent);
      setAutoTaxEnabled(data.autoTaxSetAsideEnabled);
      setFilingStatus(data.filingStatus);
    } catch (err) {
      console.error("Failed to load tax summary:", err);
      setLoadError("We couldn't load your tax-planning summary. Your settings and recorded balances have not been changed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await taxService.updateTaxSettings({
        defaultTaxRatePercent: taxRate,
        autoTaxSetAsideEnabled: autoTaxEnabled,
        filingStatus,
      });
      await loadSummary();
      toast.success("Tax reserve settings updated.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update tax settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleManualTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid transfer amount");
      return;
    }

    try {
      setTransferring(true);
      await taxService.transferTax({
        amount,
        direction: transferDirection,
      });
      setTransferModalOpen(false);
      await loadSummary();
      toast.success(
        transferDirection === "ToTaxVault"
          ? `Allocated ${formatMoney(amount)} to your recorded tax reserve.`
          : `Reallocated ${formatMoney(amount)} to your recorded operating balance.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to transfer funds");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              Tax Reserve Planning
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Plan a configurable reserve from confirmed freelance income and compare the estimate with what you have recorded.
            </p>
          </div>

          <Button
            onClick={() => setTransferModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Adjust Allocation
          </Button>
        </div>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Tax data is temporarily unavailable</p>
              <p className="mt-1 text-muted-foreground">{loadError}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadSummary()}>
              Try again
            </Button>
          </div>
        )}

        {/* Milestone Banner (Positive Reinforcement) */}
        {summary && summary.taxVaultBalance > 0 && summary.taxVaultBalance >= summary.estimatedCurrentQuarterLiability && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
                🎯
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">
                  Your workspace records {formatMoney(summary.taxVaultBalance)} in the tax-reserve category.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your recorded reserve meets the current {taxRate}% planning estimate. Verify the rate and filing deadlines for your location.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-background px-3 py-1 rounded-full border border-emerald-500/30 self-start sm:self-auto shrink-0">
              Estimate covered
            </span>
          </div>
        )}

        {/* Hero Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Recorded tax reserve card */}
          <div className="p-6 rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/[0.04] relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Recorded Tax Reserve
              </p>
              <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground mt-2">
              {formatMoney(summary?.taxVaultBalance ?? 0)}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Planning category in Tenvora's ledger</span>
            </div>
          </div>

          {/* 2. Available Spending Balance */}
          <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated Safe to Spend</p>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground mt-2">
              {formatMoney(summary?.availableSpendingBalance ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Estimated safe-to-spend operating balance
            </p>
          </div>

          {/* 3. Next Deadline Countdown */}
          <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next planning deadline</p>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {summary?.currentQuarter}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {summary?.nextQuarterDeadline ? new Date(summary.nextQuarterDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : loading ? "Loading…" : "—"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-3 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>{summary?.daysUntilQuarterDeadline ?? 0} days remaining</span>
            </div>
          </div>

          {/* 4. Estimated Quarterly Due */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Estimated Quarterly Due</p>
            <p className="text-3xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-2">
              {formatMoney(summary?.estimatedCurrentQuarterLiability ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Based on the {taxRate}% planning rule
            </p>
          </div>
        </div>

        <WorkspaceAiInsight
          title="AI tax summary"
          prompt="Explain whether my current tax reserve is on track and why, using confirmed income, the planning rate, recorded reserve, and current estimate."
        />

        {/* Tax reserve planning rule */}
        <div className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                Tax Reserve Planning Rule
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allocate a percentage of each confirmed invoice payment to a tax-planning category using balanced ledger entries.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Auto-allocation:</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoTaxEnabled}
                aria-label="Automatic tax reserve allocation"
                onClick={() => setAutoTaxEnabled(!autoTaxEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  autoTaxEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoTaxEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="min-w-7 text-xs font-semibold text-foreground">{autoTaxEnabled ? "On" : "Off"}</span>
            </div>
          </div>

          {/* Tax Rate Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                Set-Aside Rate: <span className="text-primary font-mono text-base ml-1">{taxRate}%</span>
              </p>
              <span className="text-xs text-muted-foreground font-mono">
                Choose a rate appropriate to your own situation
              </span>
            </div>

            <Slider
              aria-label="Tax reserve set-aside rate"
              value={[taxRate]}
              min={0}
              max={50}
              step={1}
              onValueChange={(val) => setTaxRate(val[0])}
              className="py-2"
            />

            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>0% (Off)</span>
              <span>15%</span>
              <span className="text-primary font-bold">25%</span>
              <span>35%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Filing Status & Tax ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tax-filing-profile" className="text-xs font-semibold">Tax filing profile</Label>
              <Select value={filingStatus} onValueChange={setFilingStatus}>
                <SelectTrigger id="tax-filing-profile" className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="Single" className="text-xs">Single</SelectItem>
                  <SelectItem value="MarriedFilingJointly" className="text-xs">Married Filing Jointly</SelectItem>
                  <SelectItem value="HeadOfHousehold" className="text-xs">Head of Household</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-id-integration" className="text-xs font-semibold">Tax ID integration</Label>
              <Input
                id="tax-id-integration"
                disabled
                value="Not collected in this build"
                className="text-xs font-mono bg-muted"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9"
              >
                {savingSettings ? "Saving..." : "Save Planning Rule"}
              </Button>
            </div>
          </div>
        </div>

        {/* Quarterly Estimated Tax Schedule (Q1 - Q4) */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Estimated quarterly schedule ({new Date().getFullYear()} example)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                An illustrative schedule from workspace settings. Confirm official dates and amounts for your jurisdiction.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="py-3 px-4">Quarter</th>
                  <th className="py-3 px-4">Earning Period</th>
                  <th className="py-3 px-4">Payment Due Date</th>
                  <th className="py-3 px-4">Estimated Liability</th>
                  <th className="py-3 px-4">Reserve Coverage</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary?.quarterlySchedule.map((q) => {
                  const isCovered = (summary.taxVaultBalance >= q.estimatedAmount);
                  return (
                    <tr key={q.quarter} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {q.quarter}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{q.periodRange}</td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {new Date(q.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {formatMoney(q.estimatedAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCovered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle className="h-3 w-3" /> Estimate covered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="h-3 w-3" /> Partially Funded
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {q.status === "Paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <Clock className="h-3 w-3" /> Upcoming
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax Set-Aside History */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Recent Tax Reserve Allocations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ledger entries that classify recorded income between operating cash and the estimated tax reserve.
            </p>
          </div>

          <div className="divide-y divide-border text-xs">
            {summary?.recentTaxSetAsides && summary.recentTaxSetAsides.length > 0 ? (
              summary.recentTaxSetAsides.map((tx) => (
                <div key={tx.transactionId} className="p-3.5 flex items-center justify-between hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{tx.description}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {tx.referenceNumber} • {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      +{formatMoney(tx.amount, tx.currency)}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">Recorded in reserve</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No recent reserve allocations recorded.
              </div>
            )}
          </div>
        </div>

        {/* Manual Transfer Dialog */}
        <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
          <DialogContent className="max-w-md bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Tax Reserve Allocation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Reclassify recorded funds between the operating balance and tax reserve. This does not move money at your bank.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="tax-allocation-direction" className="text-xs font-semibold">Allocation Direction</Label>
                <Select
                  value={transferDirection}
                  onValueChange={(v: "ToTaxVault" | "ToSpendingWallet") => setTransferDirection(v)}
                >
                  <SelectTrigger id="tax-allocation-direction" className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="ToTaxVault" className="text-xs">
                      Allocate: Operating Balance → Tax Reserve
                    </SelectItem>
                    <SelectItem value="ToSpendingWallet" className="text-xs">
                      Release: Tax Reserve → Operating Balance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tax-allocation-amount" className="text-xs font-semibold">Amount ({summary?.currency || "USD"})</Label>
                <Input
                  id="tax-allocation-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="500.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="text-xs font-mono bg-background"
                />
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1 text-xs text-muted-foreground">
                <p className="flex justify-between">
                  <span>Current Spending Balance:</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatMoney(summary?.availableSpendingBalance ?? 0)}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Current recorded reserve:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {formatMoney(summary?.taxVaultBalance ?? 0)}
                  </span>
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={transferring}
                onClick={handleManualTransfer}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              >
                {transferring ? "Allocating..." : "Confirm allocation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TaxesHub;
