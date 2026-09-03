import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  Layers,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
} from "@/components/design-system";
import { reconciliationService, ReconciliationRun, ReconciliationDiscrepancy } from "@/services/reconciliationService";

export default function ReconciliationHub() {
  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ReconciliationRun | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    setLoading(true);
    const res = await reconciliationService.getRuns();
    if (res.success && res.data) {
      setRuns(res.data);
      if (res.data.length > 0) {
        setSelectedRun(res.data[0]);
      }
    }
    setLoading(false);
  }

  async function handleTriggerReconciliation() {
    setRunning(true);
    const res = await reconciliationService.runReconciliation("Continuous automated balance invariant audit");
    setRunning(false);
    if (res.success && res.data) {
      setSelectedRun(res.data);
      loadRuns();
    }
  }

  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolveDiscrepancy(id: string) {
    const notes = window.prompt("Enter resolution notes / reason for clearing this variance:", "Audited & adjusted via manual compensatory journal entry");
    if (notes === null) return;
    setResolvingId(id);
    const res = await reconciliationService.resolveDiscrepancy(id, notes);
    setResolvingId(null);
    if (res.success) {
      loadRuns();
    }
  }

  const discrepancyColumns: Column<ReconciliationDiscrepancy>[] = [
    {
      key: "accountNumber",
      header: "Account",
      render: (d) => (
        <Link
          to={`/ledger?account=${d.accountId}`}
          className="font-mono font-bold text-foreground hover:underline inline-flex items-center gap-1"
        >
          <span>{d.accountNumber || d.accountId.substring(0, 8)}</span>
          <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
        </Link>
      ),
    },
    {
      key: "expectedBalance",
      header: "Expected Balance",
      align: "right",
      render: (d) => <MoneyDisplay amount={d.expectedBalance} size="xs" />,
    },
    {
      key: "calculatedBalance",
      header: "Calculated Balance",
      align: "right",
      render: (d) => <MoneyDisplay amount={d.calculatedBalance} size="xs" />,
    },
    {
      key: "discrepancyAmount",
      header: "Variance Amount",
      align: "right",
      render: (d) => (
        <span className="font-mono font-bold text-red-600 dark:text-red-400">
          ${d.discrepancyAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Deterministic Cause",
      render: (d) => (
        <span className="text-muted-foreground text-xs block max-w-[240px] truncate" title={d.reason}>
          {d.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Resolution",
      align: "center",
      render: (d) => <StatusBadge status={d.resolved ? "Resolved" : "Investigate"} size="sm" />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) =>
        !d.resolved ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResolveDiscrepancy(d.id)}
            disabled={resolvingId === d.id}
            className="h-6 px-2 text-[10px] font-mono border-border bg-card hover:bg-muted"
          >
            {resolvingId === d.id ? "Resolving..." : "Resolve"}
          </Button>
        ) : (
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Cleared</span>
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
              Automated Reconciliation Hub
            </h1>
            <p className="text-xs text-muted-foreground">
              Continuous background scanner verifying double-entry invariants, balance sum derivations, and ledger integrity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleTriggerReconciliation}
              disabled={running}
              className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs"
            >
              {running ? <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> : <Play className="h-3 w-3 mr-1.5" />}
              {running ? "Scanning Entire Ledger..." : "Trigger Live Audit Scan"}
            </Button>
          </div>
        </div>

        {/* Audit Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Latest Audit Health
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-bold font-mono text-foreground">
                {selectedRun?.status === "Passed" ? "Passed (100%)" : selectedRun?.status || "Pending"}
              </span>
              <StatusBadge status={selectedRun?.status || "Passed"} size="sm" />
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {selectedRun?.discrepancyCount ?? 0} active discrepancies detected
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Scanned Volume
            </div>
            <div className="mt-1 text-lg font-bold font-mono text-foreground">
              {selectedRun?.totalLedgerEntriesChecked ?? 0} Journal Entries
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Audited across {selectedRun?.totalAccountsChecked ?? 0} active accounts
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Historical Audit Runs
            </div>
            <div className="mt-1 text-lg font-bold font-mono text-foreground">
              {runs.length} Checkpoints
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">
              Last executed: {selectedRun ? new Date(selectedRun.startedAt).toLocaleTimeString() : "Live"}
            </div>
          </div>
        </div>

        {/* Scan History & Variance Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Runs History Sidebar */}
          <div className="lg:col-span-4 p-3.5 rounded border border-border bg-card space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Audit Scan History
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{runs.length} Runs</span>
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto custom-scrollbar">
              {runs.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`p-2.5 rounded border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "border-foreground bg-muted/40 font-semibold"
                        : "border-border/70 bg-card hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground">{r.runNumber}</span>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                      <span>{new Date(r.startedAt).toLocaleTimeString()}</span>
                      <span className={r.discrepancyCount > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                        {r.discrepancyCount} variances
                      </span>
                    </div>
                  </div>
                );
              })}
              {runs.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground text-center py-6 font-mono">No reconciliation runs recorded</p>
              )}
            </div>
          </div>

          {/* Discrepancy & Variance Table */}
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                  Variance Analysis &amp; Discrepancy Logs
                </h2>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Run #{selectedRun?.runNumber || "N/A"} • {selectedRun?.notes || "Automated scan"}
                </p>
              </div>
            </div>

            <DataTable
              data={selectedRun?.discrepancies || []}
              columns={discrepancyColumns}
              keyExtractor={(d) => d.id}
              loading={loading}
              pageSize={10}
              emptyTitle="Zero Discrepancies Detected"
              emptyDescription="All double-entry journal postings perfectly balance against cached account states with zero invariant drift."
              emptyAction={
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ledger Integrity 100% Verified</span>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
