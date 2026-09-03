import React, { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  FileText,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  User,
  Activity,
  Terminal,
} from "lucide-react";
import {
  MonospaceId,
  StatusBadge,
  FilterBar,
} from "@/components/design-system";
import { auditService, AuditLogItem } from "@/services/auditService";

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const res = await auditService.getLogs(undefined, undefined, 100);
    if (res.success && res.data) {
      setLogs(res.data);
    }
    setLoading(false);
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = actionFilter === "ALL" || log.action.toLowerCase() === actionFilter.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchQuery =
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        (log.notes && log.notes.toLowerCase().includes(q));
      return matchAction && matchQuery;
    });
  }, [logs, actionFilter, searchQuery]);

  const actionOptions = [
    { value: "ALL", label: "All Actions", count: logs.length },
    { value: "Created", label: "Created", count: logs.filter((l) => l.action === "Created").length },
    { value: "StatusChanged", label: "Status Changed", count: logs.filter((l) => l.action === "StatusChanged").length },
    { value: "Reconciled", label: "Reconciled", count: logs.filter((l) => l.action === "Reconciled").length },
    { value: "Reversed", label: "Reversed", count: logs.filter((l) => l.action === "Reversed").length },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Audit Event Log
            </h1>
            <p className="text-xs text-muted-foreground">
              Append-only compliance audit trail capturing state changes, authorization events, and operational actor history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search audit events by action, entity type, actor, or notes..."
          statusFilter={actionFilter}
          onStatusChange={setActionFilter}
          statusOptions={actionOptions}
          resultCount={filteredLogs.length}
          totalCount={logs.length}
        />

        {/* Audit Event Table */}
        <div className="border border-border/80 bg-card rounded overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-mono">
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3 font-bold">Timestamp (UTC)</th>
                <th className="py-2.5 px-3 font-bold">Actor</th>
                <th className="py-2.5 px-3 font-bold">Action</th>
                <th className="py-2.5 px-3 font-bold">Entity Type</th>
                <th className="py-2.5 px-3 font-bold">Entity Reference</th>
                <th className="py-2.5 px-3 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-3 px-3">
                      <div className="h-3.5 bg-muted rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const hasDetails = log.oldValue || log.newValue;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                        className={`transition-colors ${
                          hasDetails ? "cursor-pointer hover:bg-muted/30" : ""
                        } ${isExpanded ? "bg-muted/20" : ""}`}
                      >
                        <td className="py-2.5 px-2 text-center text-muted-foreground">
                          {hasDetails && (
                            isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {log.performedBy}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={log.action} size="sm" showIcon={false} />
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-foreground">
                          {log.entityType}
                        </td>
                        <td className="py-2.5 px-3">
                          <MonospaceId id={log.entityId} truncateLength={8} />
                        </td>
                        <td className="py-2.5 px-3 font-sans text-muted-foreground truncate max-w-[240px]">
                          {log.notes || "—"}
                        </td>
                      </tr>

                      {/* Expanded JSON Snapshot Diff */}
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={7} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                              {log.oldValue && (
                                <div className="p-3 rounded bg-card border border-border space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Previous State (Snapshot)
                                  </div>
                                  <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                                    {log.oldValue}
                                  </pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div className="p-3 rounded bg-card border border-border space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                                    Committed State
                                  </div>
                                  <pre className="text-[11px] text-foreground overflow-x-auto whitespace-pre-wrap">
                                    {log.newValue}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-sans">
                    <p className="font-semibold text-foreground text-xs">No audit events found</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No compliance audit records match the current search or action filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
