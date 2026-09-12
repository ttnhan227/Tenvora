import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeading, Panel, Notice, money, usePermissions } from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentService, type Transaction } from "@/services/paymentService";
import { auditService, type AuditLogItem } from "@/services/auditService";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  RotateCcw,
  Receipt,
  Layers
} from "lucide-react";

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = usePermissions();
  const [tx, setTx] = useState<Transaction>();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reverse, setReverse] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setTx(undefined);
    const [t, a] = await Promise.all([
      paymentService.getTransactionById(id),
      auditService.getLogs("Transaction", id),
    ]);
    if (t.success && t.data) setTx(t.data);
    if (a.success && a.data) setLogs(a.data);
    setError(!t.success ? t.errors?.join(" ") ?? "Transaction not found." : "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function confirmReversal(e: React.FormEvent) {
    e.preventDefault();
    if (!id || busy) return;
    setBusy(true);
    const r = await paymentService.reverseTransaction(id, reason);
    setBusy(false);
    if (r.success && r.data?.transactionId) {
      setReverse(false);
      navigate(`/transactions/${r.data.transactionId}`);
    } else {
      setError(r.errors?.join(" ") ?? "Reversal failed.");
    }
  }

  const entries = tx?.ledgerEntries ?? [];
  const source = entries.find((e) => e.creditAmount > 0);
  const destination = entries.find((e) => e.debitAmount > 0);
  const isTaxSplit = tx?.description?.toLowerCase().includes("tax") || tx?.referenceNumber?.startsWith("TAX-");

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Breadcrumb back to Payments Hub */}
        <div>
          <Link
            to="/payments"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Back to Income &amp; cash flow
          </Link>
        </div>

        {error && (
          <Notice>
            {error}{" "}
            <button className="underline font-semibold ml-1" onClick={load}>
              Retry
            </button>
          </Notice>
        )}

        {loading ? (
          <Notice>Loading transaction details from ledger...</Notice>
        ) : (
          tx && (
            <>
              {/* Header with Amount & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        tx.status === "Posted"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      {tx.status === "Posted" ? "Completed & Balanced" : tx.status}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Ref: {tx.referenceNumber}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-mono">
                    {money(tx.amount, tx.currency)}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tx.description || `${tx.transactionType} Transfer`} · {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>

                {canManage && tx.transactionType === "Transfer" && ["Posted", "Settled"].includes(tx.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReverse(!reverse)}
                    className="font-medium text-xs gap-1.5 self-start sm:self-auto"
                  >
                    <RotateCcw size={14} /> Reverse Transfer
                  </Button>
                )}
              </div>

              {/* Reversal Panel */}
              {reverse && (
                <Panel title="Review & Execute Reversal">
                  <form onSubmit={confirmReversal} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Return {money(tx.amount, tx.currency)} to the original source account. Both accounts must be active and the receiving account must have sufficient funds.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="rev-reason">Reversal Reason</Label>
                      <Input
                        id="rev-reason"
                        required
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Client requested correction or rebalance"
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReverse(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={busy}
                        size="sm"
                        className="bg-destructive hover:bg-destructive/90 text-white"
                      >
                        {busy ? "Reversing..." : "Confirm Reversal"}
                      </Button>
                    </div>
                  </form>
                </Panel>
              )}

              {/* Payment Details Card */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt size={18} className="text-primary" />
                  Transfer Information
                </h2>

                <dl className="grid gap-3 text-xs sm:grid-cols-[180px_1fr] divide-y sm:divide-y-0 divide-border">
                  <dt className="text-muted-foreground py-1 font-medium">Source Account</dt>
                  <dd className="font-semibold text-foreground py-1">
                    {source ? (
                      <span className="font-mono">{source.accountNumber || source.accountId}</span>
                    ) : (
                      "External Payment Source"
                    )}
                  </dd>

                  <dt className="text-muted-foreground py-1 font-medium">Destination Account</dt>
                  <dd className="font-semibold text-foreground py-1">
                    {destination ? (
                      <span className="font-mono text-primary">
                        {destination.accountNumber || destination.accountId}
                      </span>
                    ) : (
                      "Operating balance"
                    )}
                  </dd>

                  <dt className="text-muted-foreground py-1 font-medium">Description / Memo</dt>
                  <dd className="text-foreground py-1">{tx.description || "No memo"}</dd>

                  <dt className="text-muted-foreground py-1 font-medium">Reference Code</dt>
                  <dd className="font-mono font-bold text-foreground py-1">{tx.referenceNumber}</dd>

                  <dt className="text-muted-foreground py-1 font-medium">Transaction ID</dt>
                  <dd className="font-mono text-muted-foreground break-all py-1">{tx.id}</dd>

                  {tx.originalTransactionId && (
                    <>
                      <dt className="text-muted-foreground py-1 font-medium">Original Transfer</dt>
                      <dd className="py-1">
                        <Link
                          className="font-medium text-primary hover:underline"
                          to={`/transactions/${tx.originalTransactionId}`}
                        >
                          View original transfer →
                        </Link>
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              {/* Ledger Double-Entry Card */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers size={18} className="text-primary" />
                    Double-Entry Ledger Records ({entries.length} balanced legs)
                  </h2>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                    Balanced Debits = Credits
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-mono text-[11px] text-muted-foreground border-b border-border uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3 text-right">Debit</th>
                        <th className="py-2.5 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {entries.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                            {e.accountNumber}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            {e.debitAmount > 0 ? money(e.debitAmount, e.currency) : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {e.creditAmount > 0 ? money(e.creditAmount, e.currency) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Trail Timeline */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  Lifecycle Timeline &amp; Audit Trail
                </h2>

                <div className="space-y-3 text-xs divide-y divide-border/60">
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Transaction Created &amp; Validated</p>
                      <p className="text-muted-foreground text-[11px]">Idempotency check &amp; balance reservation</p>
                    </div>
                    <span className="font-mono text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {tx.postedAt && (
                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Posted to Immutable Ledger</p>
                        <p className="text-muted-foreground text-[11px]">Debited one category and credited the other</p>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {new Date(tx.postedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {logs.map((a) => (
                    <div key={a.id} className="pt-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{a.action}</p>
                        <p className="text-muted-foreground text-[11px]">Performed by {a.performedBy}</p>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {new Date(a.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
