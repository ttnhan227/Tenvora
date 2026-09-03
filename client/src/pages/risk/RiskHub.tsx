import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
  FilterBar,
} from "@/components/design-system";
import { riskService, RiskEvaluationItem } from "@/services/riskService";

export default function RiskHub() {
  const [evaluations, setEvaluations] = useState<RiskEvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await riskService.getEvaluations(100);
    if (res.success && res.data) {
      setEvaluations(res.data);
    }
    setLoading(false);
  }

  const criticalCount = evaluations.filter((e) => e.riskLevel === "Critical").length;
  const highCount = evaluations.filter((e) => e.riskLevel === "High").length;
  const mediumCount = evaluations.filter((e) => e.riskLevel === "Medium").length;
  const lowCount = evaluations.filter((e) => e.riskLevel === "Low").length;

  const filtered = useMemo(() => {
    return evaluations.filter((e) => {
      const matchLevel = levelFilter === "ALL" || e.riskLevel === levelFilter;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        e.id.toLowerCase().includes(q) ||
        e.paymentRequestId.toLowerCase().includes(q) ||
        e.decision.toLowerCase().includes(q) ||
        e.ruleHits.some((r) => r.toLowerCase().includes(q));
      return matchLevel && matchQuery;
    });
  }, [evaluations, levelFilter, searchQuery]);

  const levelOptions = [
    { value: "ALL", label: "All Risk Tiers", count: evaluations.length },
    { value: "Critical", label: "Critical", count: criticalCount },
    { value: "High", label: "High Risk", count: highCount },
    { value: "Medium", label: "Medium", count: mediumCount },
    { value: "Low", label: "Low (Approved)", count: lowCount },
  ];

  const columns: Column<RiskEvaluationItem>[] = [
    {
      key: "id",
      header: "Evaluation ID",
      render: (e) => <MonospaceId id={e.id} truncateLength={8} label="Evaluation ID" />,
    },
    {
      key: "paymentRequestId",
      header: "Payment Request",
      render: (e) => (
        <MonospaceId id={e.paymentRequestId} truncateLength={8} label="Payment Request ID" />
      ),
    },
    {
      key: "score",
      header: "Score (0-100)",
      align: "center",
      sortable: true,
      render: (e) => (
        <span className="font-mono font-bold text-xs">
          <span className={e.score >= 80 ? "text-red-600 font-bold" : e.score >= 50 ? "text-amber-600 font-bold" : "text-emerald-600"}>
            {e.score}
          </span>
          <span className="text-muted-foreground font-normal text-[10px]"> / 100</span>
        </span>
      ),
    },
    {
      key: "riskLevel",
      header: "Risk Tier",
      align: "center",
      sortable: true,
      render: (e) => <StatusBadge status={e.riskLevel} size="sm" />,
    },
    {
      key: "decision",
      header: "Decision",
      align: "center",
      sortable: true,
      render: (e) => <StatusBadge status={e.decision} size="sm" />,
    },
    {
      key: "ruleHits",
      header: "Triggered Rule Breakdown",
      render: (e) => (
        <div className="flex flex-wrap gap-1 max-w-[320px]">
          {e.ruleHits.length > 0 ? (
            e.ruleHits.map((rule, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-foreground border border-border/80 truncate max-w-[200px]"
                title={rule}
              >
                {rule}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground font-mono">No rule violations</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Evaluated (UTC)",
      align: "right",
      sortable: true,
      render: (e) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) =>
        e.decision === "FlaggedForReview" ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEvaluations((prev) =>
                  prev.map((item) => (item.id === e.id ? { ...item, decision: "Approved", riskLevel: "Low" } : item))
                );
              }}
              className="h-6 px-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-border bg-card hover:bg-muted"
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setEvaluations((prev) =>
                  prev.map((item) => (item.id === e.id ? { ...item, decision: "Rejected", riskLevel: "High" } : item))
                );
              }}
              className="h-6 px-2 text-[10px] font-mono"
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">Processed</span>
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
              Risk Review &amp; Rules Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Deterministic rule evaluation, anomaly detection scoring, and operational payment triage.
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
          </div>
        </div>

        {/* Risk Distribution Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Critical Risk
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-red-600">
              {criticalCount}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Immediate operator intervention
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              High Risk
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-amber-600">
              {highCount}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Flagged for manual review
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Medium Risk
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground">
              {mediumCount}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Elevated threshold watch
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Low Risk (Approved)
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-emerald-600">
              {lowCount}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Autonomous pass-through
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by evaluation ID, payment ID, or rule name..."
          statusFilter={levelFilter}
          onStatusChange={setLevelFilter}
          statusOptions={levelOptions}
          resultCount={filtered.length}
          totalCount={evaluations.length}
        />

        {/* Dense DataTable */}
        <DataTable
          data={filtered}
          columns={columns}
          keyExtractor={(e) => e.id}
          loading={loading}
          pageSize={15}
          emptyTitle="No risk evaluations match"
          emptyDescription="There are no risk evaluations recorded for this query."
        />
      </div>
    </DashboardLayout>
  );
}
