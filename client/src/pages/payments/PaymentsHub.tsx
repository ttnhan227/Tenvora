import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accountService, type Account } from "@/services/accountService";
import { paymentService, type Transaction } from "@/services/paymentService";
import { invoiceService, type InvoiceSummary } from "@/services/invoiceService";
import { StatementImportDialog } from "@/components/income/StatementImportDialog";
import { WorkspaceAiInsight } from "@/components/assistant/WorkspaceAiInsight";
import {
  ArrowRightLeft,
  DollarSign,
  Percent,
  Search,
  FileUp,
} from "lucide-react";

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const PaymentsHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [statementImportOpen, setStatementImportOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [accRes, txRes, invoiceRows] = await Promise.all([
        accountService.getAccounts(),
        paymentService.getTransactions(undefined, 100),
        invoiceService.getInvoices(),
      ]);
      if (accRes.success && accRes.data) {
        setAccounts(accRes.data.filter((a) => a.status === "Active"));
      }
      if (txRes.success && txRes.data) {
        setTransactions(txRes.data);
      }
      setInvoices(invoiceRows);
      if (!accRes.success || !txRes.success) {
        setLoadError("Some cash-flow or transaction data could not be loaded.");
      }
    } catch (err) {
      console.error("Failed to load payments data", err);
      setLoadError("We couldn't load your income activity. Your recorded balances have not been changed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get("import") === "1") {
      setStatementImportOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const mainWallet = accounts.find(
    (a) => a.accountNumber.startsWith("MAIN-") || a.accountNumber.startsWith("OP-")
  );
  const confirmedTransactions = transactions.filter(
    (transaction) =>
      transaction.description?.toLowerCase().includes("client") ||
      transaction.referenceNumber.startsWith("PAY-")
  );
  const confirmedIncome = confirmedTransactions.reduce((total, transaction) => total + transaction.amount, 0);
  const latestConfirmedAt = confirmedTransactions[0]?.createdAt;
  const matchableInvoices = invoices.filter((invoice) => invoice.status !== "Paid");

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (typeFilter === "all") return matchesSearch;
    if (typeFilter === "client")
      return (
        matchesSearch &&
        (t.description?.toLowerCase().includes("client") || t.referenceNumber.startsWith("PAY-"))
      );
    if (typeFilter === "tax")
      return (
        matchesSearch &&
        (t.description?.toLowerCase().includes("tax") || t.referenceNumber.startsWith("TAX-"))
      );
    return matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Income &amp; cash flow
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Import deposits, match them to invoices, and see what is reserved for taxes versus safe to spend.
            </p>
          </div>
          <div>
            <Button
              onClick={() => setStatementImportOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              <FileUp size={16} className="mr-1.5" /> Import statement
            </Button>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Income data is temporarily unavailable</p>
              <p className="mt-1 text-muted-foreground">{loadError}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
              Try again
            </Button>
          </div>
        )}

        {/* Income-specific summary. Home keeps the overall financial picture. */}
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5 shadow-xs">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <DollarSign size={15} className="text-emerald-600" /> Confirmed payments
            </p>
            <p className="mt-3 text-3xl font-black font-mono text-foreground">
              {loading ? "..." : formatCurrency(confirmedIncome, mainWallet?.currency ?? "USD")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {confirmedTransactions.length} payment{confirmedTransactions.length === 1 ? "" : "s"} recorded
              {latestConfirmedAt ? ` · latest ${new Date(latestConfirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
            </p>
          </section>

          <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5 shadow-xs">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ArrowRightLeft size={15} className="text-primary" /> Payment records
            </p>
            <p className="mt-3 text-3xl font-black font-mono text-foreground">
              {loading ? "..." : confirmedTransactions.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Confirmed deposits linked to client income</p>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <FileUp size={15} className="text-primary" /> Available to match
            </p>
            <p className="mt-3 text-3xl font-black font-mono text-foreground">
              {loading ? "..." : matchableInvoices.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Unpaid invoices that can receive a confirmed match</p>
          </section>
        </div>

        <WorkspaceAiInsight
          title="AI income summary"
          prompt="Explain my recent confirmed income and average monthly earnings, then tell me why any open income item needs review."
        />

        <div className="grid gap-3 rounded-2xl border border-border/80 bg-muted/20 p-4 text-xs sm:grid-cols-3">
          <p><span className="font-bold text-foreground">1. Local review</span><br /><span className="text-muted-foreground">The CSV stays in this browser while rows are parsed.</span></p>
          <p><span className="font-bold text-foreground">2. Your confirmation</span><br /><span className="text-muted-foreground">A suggested match changes nothing until you approve it.</span></p>
          <p><span className="font-bold text-foreground">3. Recorded result</span><br /><span className="text-muted-foreground">The invoice, income, and reserve records update together.</span></p>
        </div>

        {/* Cash-flow activity & filter bar */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Cash-flow activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recorded invoice payments, tax allocations, and internal balance movements
              </p>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  aria-label="Search transaction history"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cash-flow records..."
                  className="h-9 w-full sm:w-64 pl-8 text-xs bg-background"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger aria-label="Filter transaction type" className="h-9 text-xs w-36 shrink-0 bg-background">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="client">Confirmed Income</SelectItem>
                  <SelectItem value="tax">Tax Reserve</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => {
                const isCredit =
                  tx.description?.toLowerCase().includes("client") ||
                  tx.referenceNumber.startsWith("PAY-");
                const isTaxSplit =
                  tx.description?.toLowerCase().includes("tax") ||
                  tx.referenceNumber.startsWith("TAX-");

                return (
                  <Link
                    key={tx.id}
                    to={`/transactions/${tx.id}`}
                    className="py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-muted/30 px-3 -mx-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isTaxSplit
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : isCredit
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isTaxSplit ? (
                          <Percent size={18} />
                        ) : isCredit ? (
                          <DollarSign size={18} />
                        ) : (
                          <ArrowRightLeft size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {tx.description || tx.referenceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(tx.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · Ref: {tx.referenceNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          isTaxSplit
                            ? "text-amber-700 dark:text-amber-400"
                            : isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {formatCurrency(tx.amount, tx.currency)}
                      </p>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        {tx.status === "Posted" ? "Completed" : tx.status}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="py-10 text-center space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {searchQuery ? `No transactions matching "${searchQuery}"` : "No transactions yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search term or filter."
                    : "Confirmed invoice payments and their tax-reserve entries will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>

        <StatementImportDialog
          open={statementImportOpen}
          onOpenChange={setStatementImportOpen}
          invoices={invoices}
          defaultCurrency={mainWallet?.currency ?? "USD"}
          onPaymentRecorded={loadData}
        />

      </div>
    </DashboardLayout>
  );
};

export default PaymentsHub;
