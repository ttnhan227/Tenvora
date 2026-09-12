import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Calendar,
  Percent,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  DollarSign,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { taxService, type TaxSummary } from "@/services/taxService";
import { invoiceService, type InvoiceSummary, type InvoiceStats } from "@/services/invoiceService";
import { paymentService, type Transaction } from "@/services/paymentService";
import { WorkspaceAiInsight } from "@/components/assistant/WorkspaceAiInsight";

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);
  const [openInvoices, setOpenInvoices] = useState<InvoiceSummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [taxesRes, statsRes, invoicesRes, txRes] = await Promise.all([
          taxService.getTaxSummary(),
          invoiceService.getInvoiceStats(),
          invoiceService.getInvoices("Sent"),
          paymentService.getTransactions(undefined, 5),
        ]);

        setTaxSummary(taxesRes);
        setInvoiceStats(statsRes);
        setOpenInvoices(invoicesRes.slice(0, 4));
        if (txRes.success && txRes.data) {
          setRecentTransactions(txRes.data);
        }
      } catch (err) {
        setError("Unable to load your financial data. Refresh to retry.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, []);

  const availableSpend = taxSummary?.availableSpendingBalance ?? 0;
  const taxVault = taxSummary?.taxVaultBalance ?? 0;
  const incomingInvoices = invoiceStats?.totalOutstandingAmount ?? 0;
  const openCount = invoiceStats?.openInvoicesCount ?? openInvoices.length;
  const taxRate = taxSummary?.defaultTaxRatePercent ?? 25;
  const reportingCurrency = taxSummary?.currency ?? user?.preferredCurrency ?? "USD";
  const invoiceReportingCurrency = invoiceStats?.currency ?? reportingCurrency;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {/* Warm Greeting & Quick Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Freelancer cash-flow workspace
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {user?.companyName?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              See what has been paid, what is still due, what to reserve, and what may be safe to spend.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold rounded-xl">
              <Link to="/invoices?create=1">
                <Plus size={16} className="mr-1.5" /> Create Invoice
              </Link>
            </Button>
          </div>
        </div>

        {/* Core decision: estimated safe to spend from confirmed records */}
        <div className="rounded-3xl bg-brand-ink text-white p-6 sm:p-8 shadow-xl shadow-slate-950/20 relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Estimated safe to spend</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
                  Based on confirmed records
                </span>
              </div>
              <p className="mt-3 text-4xl sm:text-5xl font-black tracking-tight font-mono text-white">
                {loading ? "..." : formatCurrency(availableSpend, reportingCurrency)}
              </p>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-300">
                Confirmed income after your estimated {taxRate}% tax reserve. Tenvora does not read your bank balance or move funds.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current calculation</p>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-300">Confirmed income this year</dt>
                  <dd className="font-mono font-bold text-white">{loading ? "..." : formatCurrency(taxSummary?.ytdGrossIncome ?? 0, reportingCurrency)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-300">Unpaid invoices excluded</dt>
                  <dd className="font-mono font-bold text-white">{loading ? "..." : formatCurrency(incomingInvoices, invoiceReportingCurrency)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2">
                  <dt className="font-semibold text-white">Tax planning rule</dt>
                  <dd className="font-mono font-black text-amber-300">{taxRate}%</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Milestone Banner (Positive Reinforcement) */}
        {taxVault > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
                🎯
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  You have recorded {formatCurrency(taxVault, reportingCurrency)} in your estimated tax reserve.
                </p>
                <p className="text-xs text-muted-foreground">
                  This reflects confirmed allocations recorded in your workspace. Review the estimate before filing or moving real funds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Overview Cards: Tax Vault & Awaiting Payment */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Card 1: Protected Tax Vault */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs relative overflow-hidden transition-all hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" /> Estimated tax reserve
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                {taxSummary?.autoTaxSetAsideEnabled ? `${taxRate}% rule on` : "Rule off"}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                {loading ? "..." : formatCurrency(taxVault, reportingCurrency)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                A planning category in Tenvora—not a separate bank account
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Verify deadlines for your location</span>
              <Link to="/taxes" className="font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1">
                Review estimate <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 2: Money on the Way (Open Invoices) */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs relative overflow-hidden transition-all hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock size={16} className="text-amber-500" /> Awaiting Payment
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                {openCount} unpaid
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                {loading ? "..." : formatCurrency(incomingInvoices, invoiceReportingCurrency)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Expected from sent client invoices due this month
              </p>
            </div>
            <div className="mt-5 border-t border-border/60 pt-3.5 text-xs">
              <span className="text-muted-foreground">
                {taxSummary?.autoTaxSetAsideEnabled ? `${taxRate}% reserve rule enabled` : "Reserve rule is currently off"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Invoices & Activity vs Tax Schedule & AI Copilot */}
        <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          {/* Left column: upcoming invoices and recent income */}
          <div className="space-y-6">
            {/* Open Invoices Waiting for Client Payment */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div>
                  <h2 className="text-base font-bold text-foreground">Open Client Invoices</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invoices awaiting client payment. The reserve rule is applied only when it is enabled.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border/60 mt-1">
                {openInvoices.length > 0 ? (
                  openInvoices.map((inv) => (
                    <div key={inv.id} className="py-4 flex items-center justify-between gap-4 hover:bg-muted/10 rounded-xl px-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono shrink-0">
                          {inv.clientName?.slice(0, 2).toUpperCase() || "CL"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{inv.clientName}</span>
                            <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{inv.invoiceNumber}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {inv.paymentTerms || "Net 14"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground font-mono">
                          {formatCurrency(inv.totalAmount, inv.currency)}
                        </p>
                        <Link
                          to={`/invoices?pay=${inv.id}`}
                          className="text-xs font-medium text-primary hover:underline flex items-center justify-end gap-1 mt-0.5"
                        >
                          <CheckCircle2 size={12} /> Record Payment
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-sm font-semibold text-foreground">All client invoices are paid up! 🎉</p>
                    <p className="text-xs text-muted-foreground">No invoices awaiting payment right now. Send your next invoice when milestone work is ready.</p>
                    <p className="text-[11px] font-medium text-primary">Use Create Invoice at the top when the next milestone is ready.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent income activity */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div>
                  <h2 className="text-base font-bold text-foreground">Recent Income Activity</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Confirmed client income and tax-reserve planning
                  </p>
                </div>
                <Link to="/payments" className="inline-flex min-h-8 items-center text-xs font-semibold text-primary hover:underline">
                  View All →
                </Link>
              </div>

              <div className="divide-y divide-border/60 mt-1">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => {
                    const isCredit = tx.description?.toLowerCase().includes("client") || tx.referenceNumber.startsWith("PAY-");
                    const isTaxSplit = tx.description?.toLowerCase().includes("tax") || tx.referenceNumber.startsWith("TAX-");

                    return (
                      <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 rounded-xl px-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isTaxSplit
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : isCredit
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isTaxSplit ? (
                              <Percent size={17} />
                            ) : isCredit ? (
                              <DollarSign size={17} />
                            ) : (
                              <ArrowRightLeft size={17} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {tx.description || tx.referenceNumber}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(tx.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {tx.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-bold font-mono ${
                              isTaxSplit
                                ? "text-amber-700 dark:text-amber-400"
                                : isCredit
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            }`}
                          >
                            {isCredit ? "+" : ""}{formatCurrency(tx.amount, tx.currency)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Transactions and client payments will appear here.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Taxes Box & AI Financial Copilot */}
          <div className="space-y-6">
            {/* Quarterly Tax Snapshot */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={14} className="text-amber-600 dark:text-amber-400" /> Estimated Taxes
                </span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  On Track
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Estimated tax planning checkpoint</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {taxSummary?.nextQuarterDeadline
                    ? new Date(taxSummary.nextQuarterDeadline).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not configured"}
                </p>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 space-y-2 border border-border/60">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Quarter Target Estimate</span>
                  <span className="font-semibold text-foreground font-mono">
                    {loading ? "..." : taxSummary ? formatCurrency(taxSummary.estimatedCurrentQuarterLiability, reportingCurrency) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recorded tax reserve</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {formatCurrency(taxVault, reportingCurrency)}
                  </span>
                </div>
                <div className="w-full bg-border/60 rounded-full h-2 mt-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((taxVault / Math.max(1, taxSummary?.estimatedCurrentQuarterLiability ?? 0)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

            </div>

            <WorkspaceAiInsight
              title="AI workspace summary"
              prompt="Give me a concise overview of my most important financial priority today and explain why using my current workspace records."
              className="rounded-3xl"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
