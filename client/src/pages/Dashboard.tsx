import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  BookOpen,
  Activity,
  ChevronRight,
  Newspaper,
  RefreshCw,
  ExternalLink,
  Plus,
  Server,
  Filter,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
} from "@/components/design-system";
import { accountService, Account } from "@/services/accountService";
import { paymentService, Transaction } from "@/services/paymentService";
import { reconciliationService, ReconciliationRun } from "@/services/reconciliationService";
import { settlementService, SettlementBatch } from "@/services/settlementService";
import { intelligenceService, ExternalArticle, MarketExchangeRate } from "@/services/intelligenceService";
import { riskService, RiskEvaluationItem } from "@/services/riskService";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentRuns, setRecentRuns] = useState<ReconciliationRun[]>([]);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [articles, setArticles] = useState<ExternalArticle[]>([]);
  const [marketRates, setMarketRates] = useState<MarketExchangeRate[]>([]);
  const [riskEvaluations, setRiskEvaluations] = useState<RiskEvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [accRes, txRes, reconRes, batchRes, intelRes, ratesRes, riskRes] = await Promise.all([
      accountService.getAccounts(),
      paymentService.getTransactions(undefined, 15),
      reconciliationService.getRuns(),
      settlementService.getBatches(),
      intelligenceService.getFeed(undefined, undefined, 4),
      intelligenceService.getMarketRates(),
      riskService.getEvaluations(10),
    ]);

    if (accRes.success && accRes.data) setAccounts(accRes.data);
    if (txRes.success && txRes.data) setTransactions(txRes.data);
    if (reconRes.success && reconRes.data) setRecentRuns(reconRes.data);
    if (batchRes.success && batchRes.data) setBatches(batchRes.data);
    if (intelRes.success && intelRes.data) setArticles(intelRes.data.articles);
    if (ratesRes.success && ratesRes.data) setMarketRates(ratesRes.data);
    if (riskRes.success && riskRes.data) setRiskEvaluations(riskRes.data);
    setLoading(false);
  }

  // Financial calculations
  const assetAccounts = accounts.filter((a) => a.accountType === "Asset");
  const availableLiquidity = assetAccounts.reduce((acc, a) => acc + a.cachedBalance, 0);

  const pendingTransactions = transactions.filter((t) => t.status === "Pending");
  const pendingAmount = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);

  const postedTransactions = transactions.filter((t) => t.status === "Posted" || t.status === "Settled");
  const todayVolume = postedTransactions.reduce((acc, t) => acc + t.amount, 0);

  const latestRecon = recentRuns[0];
  const pendingBatches = batches.filter((b) => b.status === "Pending" || b.status === "Open");
  const highRiskReviews = riskEvaluations.filter((r) => r.riskLevel === "High" || r.riskLevel === "Critical" || r.decision === "FlaggedForReview");
  const failedCount = transactions.filter((t) => t.status === "Failed").length;

  const transactionColumns: Column<Transaction>[] = [
    {
      key: "referenceNumber",
      header: "Reference",
      sortable: true,
      render: (tx) => (
        <MonospaceId id={tx.referenceNumber} to={`/transactions/${tx.id}`} label="Reference Number" />
      ),
    },
    {
      key: "transactionType",
      header: "Type",
      sortable: true,
      render: (tx) => <span className="font-mono text-muted-foreground">{tx.transactionType}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      render: (tx) => (
        <MoneyDisplay amount={tx.amount} currency={tx.currency} size="xs" />
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      sortable: true,
      render: (tx) => <StatusBadge status={tx.status} size="sm" />,
    },
    {
      key: "createdAt",
      header: "Timestamp",
      align: "right",
      sortable: true,
      render: (tx) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (tx) => (
        <Link
          to={`/transactions/${tx.id}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-0.5"
        >
          <span>View</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Operations Overview
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time payment rails, continuous ledger reconciliation, and treasury liquidity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card border-border"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/transfers">
              <Button size="sm" className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs">
                <Plus className="h-3 w-3 mr-1" />
                Initiate Transfer
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. Stripe-Style Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-md border border-border bg-card shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
              Available Liquidity
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={availableLiquidity} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {assetAccounts.length} operational treasury accounts
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-card shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
              Pending Clearings
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={pendingAmount} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {pendingTransactions.length} payments awaiting batch commit
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-card shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
              Today's Processed Volume
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={todayVolume} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {postedTransactions.length} balanced journal transfers
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-card shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
              Settlement Status
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-foreground">
                {batches.length} Batches
              </span>
              <StatusBadge status={pendingBatches.length > 0 ? "Pending" : "Settled"} size="sm" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {pendingBatches.length} batches queued for clearing
            </div>
          </div>
        </div>

        {/* 2. Operational Health & Actionable Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Operational State Indicators */}
          <div className="lg:col-span-8 p-4 rounded-md border border-border bg-card shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[#635BFF]" />
                Operational Rails Status
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Continuous Invariant Verification
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Payment Engine</div>
                <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Healthy</span>
                </div>
                <div className="text-[10px] text-muted-foreground">Ascending Locks</div>
              </div>

              <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Reconciliation</div>
                <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${latestRecon?.discrepancyCount ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span>{latestRecon ? `${latestRecon.status}` : "Verified"}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {latestRecon?.discrepancyCount ?? 0} discrepancies
                </div>
              </div>

              <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Risk Review Queue</div>
                <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${highRiskReviews.length > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span>{highRiskReviews.length} Flagged</span>
                </div>
                <div className="text-[10px] text-muted-foreground">Deterministic Rules</div>
              </div>

              <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Failed Transfers</div>
                <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${failedCount > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
                  <span>{failedCount} Incurred</span>
                </div>
                <div className="text-[10px] text-muted-foreground">Atomic rollback</div>
              </div>
            </div>
          </div>

          {/* Actionable Alerts Panel */}
          <div className="lg:col-span-4 p-4 rounded-md border border-border bg-card shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)] flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border/70">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                  Action Required
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {highRiskReviews.length + (latestRecon?.discrepancyCount ? 1 : 0)} items
                </span>
              </div>

              <div className="space-y-2 mt-2">
                {highRiskReviews.length > 0 && (
                  <Link
                    to="/risk"
                    className="p-2.5 rounded-md bg-[#FFF8EB] border border-[#FFE1A8] dark:bg-[#78350F]/20 dark:border-[#D97706]/30 flex items-center justify-between hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-[#8F5B00] dark:text-[#FCD34D]">
                          {highRiskReviews.length} transaction{highRiskReviews.length > 1 ? "s" : ""} flagged for review
                        </p>
                        <p className="text-[10px] text-[#B45309] dark:text-[#FDE68A]">
                          Threshold or balance depletion rules triggered
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-[#D97706] shrink-0" />
                  </Link>
                )}

                {latestRecon?.discrepancyCount && latestRecon.discrepancyCount > 0 ? (
                  <Link
                    to="/reconciliation"
                    className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] dark:bg-[#7F1D1D]/20 dark:border-[#DC2626]/30 flex items-center justify-between hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-[#DF1B41] shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-[#991B1B] dark:text-[#FCA5A5]">
                          {latestRecon.discrepancyCount} reconciliation discrepancies
                        </p>
                        <p className="text-[10px] text-[#B91C1C] dark:text-[#FECACA]">
                          Review balance variances in run #{latestRecon.runNumber}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-[#DF1B41] shrink-0" />
                  </Link>
                ) : (
                  <div className="p-2.5 rounded-md bg-[#EBFBF3] border border-[#A3E6CD] dark:bg-[#064E3B]/20 dark:border-[#059669]/30 text-xs text-[#0E6251] dark:text-[#6EE7B7] flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#00D924] shrink-0" />
                    <span className="font-medium">All general ledger balances perfectly reconciled.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px]">
              <Link to="/reconciliation" className="text-[#635BFF] hover:underline font-mono font-semibold">
                Audit Checkpoints →
              </Link>
              <Link to="/settlements" className="text-[#635BFF] hover:underline font-mono font-semibold">
                Batch Queues →
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Primary Data Table: Recent Transactions Journal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Recent Transactions</h2>
              <p className="text-[11px] text-muted-foreground">
                Direct double-entry ledger postings with immutable audit records
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-[#635BFF] hover:underline inline-flex items-center gap-1 font-mono"
            >
              <span>View all transactions</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <DataTable
            data={transactions.slice(0, 8)}
            columns={transactionColumns}
            keyExtractor={(tx) => tx.id}
            loading={loading}
            pageSize={8}
            emptyTitle="No transactions recorded"
            emptyDescription="There are no payment operations in this organization partition."
            emptyAction={
              <Link to="/transfers">
                <Button size="sm" className="h-7 text-xs bg-foreground text-background">
                  Initiate First Transfer
                </Button>
              </Link>
            }
          />
        </div>

        {/* 4. Restrained Financial Intelligence & Reference Rates */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                Financial Intelligence &amp; Market Context
              </h2>
            </div>
            <Link
              to="/intelligence"
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline font-mono inline-flex items-center gap-1"
            >
              <span>All Bulletins</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Curated Regulatory News List */}
            <div className="lg:col-span-8 divide-y divide-border/60 border border-border bg-card rounded">
              {articles.slice(0, 3).map((art) => (
                <div key={art.id} className="p-3 hover:bg-muted/20 transition-colors flex flex-col justify-between gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-muted text-foreground border border-border">
                          {art.source}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(art.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={art.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-foreground hover:underline block leading-snug truncate"
                      >
                        {art.title}
                      </a>
                    </div>
                    <a
                      href={art.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {art.summary}
                  </p>
                </div>
              ))}
            </div>

            {/* ECB Reference Rates Snapshot */}
            <div className="lg:col-span-4 p-3 rounded border border-border bg-card space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border">
                <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                  ECB Reference FX Rates
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">Daily 16:00 CET</span>
              </div>
              <div className="space-y-1">
                {marketRates.slice(0, 4).map((rate) => (
                  <div
                    key={rate.targetCurrency}
                    className="flex items-center justify-between px-2 py-1 rounded bg-muted/20 border border-border/50 text-xs font-mono"
                  >
                    <span className="text-muted-foreground">
                      {rate.baseCurrency}/{rate.targetCurrency}
                    </span>
                    <span className="font-bold text-foreground">{rate.rate.toFixed(4)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 text-right">
                <Link to="/intelligence" className="text-[10px] font-mono text-muted-foreground hover:text-foreground hover:underline">
                  Full Market Context →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
