import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRightLeft,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  Eye,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
  FilterBar,
} from "@/components/design-system";
import { paymentService, Transaction } from "@/services/paymentService";
import { accountService, Account } from "@/services/accountService";

export default function Transfers() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Transfer Dialog State
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destAccountId, setDestAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reversal Dialog State
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    const filter = statusFilter === "ALL" ? undefined : statusFilter;
    const [txRes, accRes] = await Promise.all([
      paymentService.getTransactions(filter, 100),
      accountService.getAccounts(),
    ]);

    if (txRes.success && txRes.data) setTransactions(txRes.data);
    if (accRes.success && accRes.data) setAccounts(accRes.data);
    setLoading(false);
  }

  function openNewTransferDialog() {
    setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    setErrorMessage(null);
    if (accounts.length >= 2) {
      setSourceAccountId(accounts[0].id);
      setDestAccountId(accounts[1].id);
    }
    setTransferDialogOpen(true);
  }

  async function handleExecuteTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (accounts.length < 2) {
      setErrorMessage("At least two accounts are required to execute a transfer. Please open accounts first.");
      return;
    }
    if (!sourceAccountId || !destAccountId) {
      setErrorMessage("Please select both a source and destination account.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setErrorMessage("Please enter a valid transfer amount greater than 0.00.");
      return;
    }
    if (sourceAccountId === destAccountId) {
      setErrorMessage("Source and destination accounts must be distinct accounts.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const result = await paymentService.executeTransfer(idempotencyKey, {
      sourceAccountId,
      destinationAccountId: destAccountId,
      amount: parseFloat(amount),
      currency,
      description: description || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      setTransferDialogOpen(false);
      setAmount("");
      setDescription("");
      loadData();
    } else {
      setErrorMessage(result.errors?.[0] || "Transfer execution failed.");
    }
  }

  async function handleReverseTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTx) return;

    setReversing(true);
    const result = await paymentService.reverseTransaction(selectedTx.id, reversalReason);
    setReversing(false);

    if (result.success) {
      setReversalDialogOpen(false);
      setSelectedTx(null);
      setReversalReason("");
      loadData();
    }
  }

  // Filter logic
  const filtered = transactions.filter((tx) => {
    const q = searchQuery.toLowerCase();
    return (
      tx.referenceNumber.toLowerCase().includes(q) ||
      tx.transactionType.toLowerCase().includes(q) ||
      (tx.description && tx.description.toLowerCase().includes(q)) ||
      tx.currency.toLowerCase().includes(q)
    );
  });

  const statusOptions = [
    { value: "ALL", label: "All Transfers", count: transactions.length },
    { value: "Posted", label: "Posted", count: transactions.filter((t) => t.status === "Posted").length },
    { value: "Settled", label: "Settled", count: transactions.filter((t) => t.status === "Settled").length },
    { value: "Reversed", label: "Reversed", count: transactions.filter((t) => t.status === "Reversed").length },
    { value: "Failed", label: "Failed", count: transactions.filter((t) => t.status === "Failed").length },
  ];

  const columns: Column<Transaction>[] = [
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
      key: "ledgerEntriesCount",
      header: "Journal Postings",
      align: "center",
      sortable: true,
      render: (tx) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          <span className="px-1.5 py-0.2 rounded bg-muted font-bold text-foreground">{tx.ledgerEntriesCount}</span> entries
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Timestamp (UTC)",
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
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link to={`/transactions/${tx.id}`}>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              <Eye className="h-3 w-3 mr-1" />
              Inspect
            </Button>
          </Link>
          {(tx.status === "Posted" || tx.status === "Settled") && tx.transactionType !== "Reversal" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTx(tx);
                setReversalDialogOpen(true);
              }}
              className="h-6 px-2 text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 border-border"
            >
              <RotateCcw className="h-2.5 w-2.5 mr-1" />
              Reverse
            </Button>
          )}
        </div>
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
              Transfers &amp; Fund Movement
            </h1>
            <p className="text-xs text-muted-foreground">
              Execute atomic multi-account transfers with exclusive row locks, strict idempotency, and balanced ledger entries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={openNewTransferDialog}
              size="sm"
              className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Fund Transfer
            </Button>
          </div>
        </div>

        {/* Transfer Modal Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent className="sm:max-w-[480px] bg-card border border-border text-xs rounded-lg p-5">
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-foreground" />
                  Execute Atomic Fund Transfer
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Locks source and destination accounts in sorted ID order, then creates balanced double-entry lines.
                </DialogDescription>
              </DialogHeader>

              {errorMessage && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="src" className="text-[11px] font-semibold text-muted-foreground">
                    Source Account (Debit)
                  </Label>
                  <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs font-mono">
                          {a.accountNumber} (${a.cachedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dst" className="text-[11px] font-semibold text-muted-foreground">
                    Destination Account (Credit)
                  </Label>
                  <Select value={destAccountId} onValueChange={setDestAccountId}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs font-mono">
                          {a.accountNumber} (${a.cachedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="amt" className="text-[11px] font-semibold text-muted-foreground">
                    Amount
                  </Label>
                  <Input
                    id="amt"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="curr" className="text-[11px] font-semibold text-muted-foreground">
                    Currency (ISO-4217)
                  </Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD" className="text-xs font-mono">USD</SelectItem>
                      <SelectItem value="EUR" className="text-xs font-mono">EUR</SelectItem>
                      <SelectItem value="GBP" className="text-xs font-mono">GBP</SelectItem>
                      <SelectItem value="SGD" className="text-xs font-mono">SGD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc" className="text-[11px] font-semibold text-muted-foreground">
                  Description / Purpose
                </Label>
                <Input
                  id="desc"
                  placeholder="e.g. Counterparty invoice settlement or treasury rebalance"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="p-2.5 rounded bg-muted/30 border border-border/80 space-y-1 font-mono text-[10px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Idempotency Key</span>
                  <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Lock Active</span>
                </div>
                <div className="text-foreground truncate select-all">{idempotencyKey}</div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  {submitting ? "Committing Ledger Entries..." : "Commit Transfer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reversal Confirmation Dialog */}
        <Dialog open={reversalDialogOpen} onOpenChange={setReversalDialogOpen}>
          <DialogContent className="sm:max-w-[420px] bg-card border border-border text-xs rounded-lg p-5">
            <form onSubmit={handleReverseTransaction} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-sm font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <RotateCcw className="h-4 w-4" />
                  Post Compensating Reversal
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Appends inverted debit and credit journal lines. The original posted record remains immutable.
                </DialogDescription>
              </DialogHeader>

              {selectedTx && (
                <div className="p-2.5 rounded border border-border bg-muted/20 space-y-1 text-xs font-mono">
                  <div className="flex justify-between font-bold">
                    <span>{selectedTx.referenceNumber}</span>
                    <span>${selectedTx.amount.toFixed(2)} {selectedTx.currency}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">ID: {selectedTx.id}</div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="revReason" className="text-[11px] font-semibold text-muted-foreground">
                  Reason for Reversal
                </Label>
                <Input
                  id="revReason"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate transfer, counterparty return, or customer dispute"
                  required
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={reversing}
                  variant="destructive"
                  className="h-8 px-3 text-xs font-semibold"
                >
                  {reversing ? "Posting Reversal..." : "Confirm & Commit Reversal"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Filter transfers by reference, memo, currency..."
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={statusOptions}
          resultCount={filtered.length}
          totalCount={transactions.length}
        />

        {/* DataTable */}
        <DataTable
          data={filtered}
          columns={columns}
          keyExtractor={(t) => t.id}
          loading={loading}
          pageSize={15}
          onRowClick={(tx) => navigate(`/transactions/${tx.id}`)}
          emptyTitle="No transfers recorded"
          emptyDescription="There are no transfer records matching your active filters."
        />
      </div>
    </DashboardLayout>
  );
}
