import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
} from "@/components/design-system";
import { accountService, Account } from "@/services/accountService";
import { ledgerService, AccountLedgerHistory, LedgerEntry } from "@/services/ledgerService";

export default function LedgerView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(searchParams.get("account") || "");
  const [history, setHistory] = useState<AccountLedgerHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const accountParam = searchParams.get("account");

  useEffect(() => {
    if (accountParam && accountParam !== selectedAccountId) {
      setSelectedAccountId(accountParam);
    }
  }, [accountParam]);

  useEffect(() => {
    async function loadAccounts() {
      const res = await accountService.getAccounts();
      if (res.success && res.data && res.data.length > 0) {
        setAccounts(res.data);
        if (!selectedAccountId && !accountParam) {
          setSelectedAccountId(res.data[0].id);
        }
      }
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    setSearchParams({ account: selectedAccountId });

    async function loadHistory() {
      setLoading(true);
      const res = await ledgerService.getAccountLedgerHistory(selectedAccountId);
      if (res.success && res.data) {
        setHistory(res.data);
      }
      setLoading(false);
    }
    loadHistory();
  }, [selectedAccountId]);

  const totalDebits = history?.entries.reduce((sum, e) => sum + e.debitAmount, 0) || 0;
  const totalCredits = history?.entries.reduce((sum, e) => sum + e.creditAmount, 0) || 0;
  const isMatch = history?.balanceMatches ?? (history ? Math.abs(history.cachedBalance - history.derivedBalance) < 0.001 : true);

  const filteredEntries = (history?.entries || []).filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      (e.transactionId && e.transactionId.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      e.entryType.toLowerCase().includes(q)
    );
  });

  const columns: Column<LedgerEntry>[] = [
    {
      key: "id",
      header: "Entry ID",
      render: (e) => <MonospaceId id={e.id} truncateLength={8} label="Ledger Entry ID" />,
    },
    {
      key: "transactionId",
      header: "Transaction Ref",
      render: (e) =>
        e.transactionId ? (
          <Link
            to={`/transactions/${e.transactionId}`}
            className="text-xs font-mono font-semibold text-foreground hover:underline inline-flex items-center gap-1"
          >
            <span>{e.transactionId.substring(0, 8)}...</span>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
          </Link>
        ) : (
          <span className="text-muted-foreground text-[11px] font-mono">System Initial / Opening</span>
        ),
    },
    {
      key: "entryType",
      header: "Type",
      align: "center",
      render: (e) => <StatusBadge status={e.entryType} size="sm" showIcon={false} />,
    },
    {
      key: "debitAmount",
      header: "Debit ($)",
      align: "right",
      sortable: true,
      render: (e) =>
        e.debitAmount > 0 ? (
          <MoneyDisplay amount={e.debitAmount} currency={history?.currency} size="xs" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "creditAmount",
      header: "Credit ($)",
      align: "right",
      sortable: true,
      render: (e) =>
        e.creditAmount > 0 ? (
          <MoneyDisplay amount={e.creditAmount} currency={history?.currency} size="xs" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "description",
      header: "Description / Journal Memo",
      render: (e) => (
        <span className="text-muted-foreground truncate max-w-[220px] block" title={e.description}>
          {e.description || "Journal Posting"}
        </span>
      ),
    },
    {
      key: "postedAt",
      header: "Timestamp (UTC)",
      align: "right",
      sortable: true,
      render: (e) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(e.postedAt).toLocaleDateString()} {new Date(e.postedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              General Ledger Journal
            </h1>
            <p className="text-xs text-muted-foreground">
              Audit immutable debit and credit journal lines and verify derived ledger sums against cached database state.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-8 text-xs font-mono font-semibold bg-card border-border">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs font-mono">
                    {a.accountNumber} ({a.currency}) - ${a.cachedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Balance Audit & Mathematical Invariant Strip */}
        {history && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded border border-border bg-card">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Cached Account Balance
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-foreground">
                <MoneyDisplay amount={history.cachedBalance} currency={history.currency} size="md" />
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                {history.accountType} Account
              </div>
            </div>

            <div className="p-3.5 rounded border border-border bg-card">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Derived Ledger Sum
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-foreground">
                <MoneyDisplay amount={history.derivedBalance} currency={history.currency} size="md" />
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                Σ Debits − Σ Credits
              </div>
            </div>

            <div className="p-3.5 rounded border border-border bg-card">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Invariant Integrity
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold">
                {isMatch ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Balanced (Δ = 0.00)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Discrepancy Detected</span>
                  </>
                )}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                Zero Balance Drift
              </div>
            </div>

            <div className="p-3.5 rounded border border-border bg-card">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Total Inflow / Outflow
              </div>
              <div className="mt-1 text-xs font-mono font-bold text-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debits:</span>
                  <span>${totalDebits.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits:</span>
                  <span>${totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Entry Filter */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries by ID, transaction reference, memo..."
              className="w-full pl-7 pr-3 h-8 text-xs rounded border border-border bg-card font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {filteredEntries.length} Recorded Entries
          </span>
        </div>

        {/* Dense DataTable */}
        <DataTable
          data={filteredEntries}
          columns={columns}
          keyExtractor={(e) => e.id}
          loading={loading}
          pageSize={20}
          emptyTitle="No journal entries found"
          emptyDescription="There are no debit or credit journal lines for this account."
        />
      </div>
    </DashboardLayout>
  );
}
