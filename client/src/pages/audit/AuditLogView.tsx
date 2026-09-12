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
  Code2,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  MonospaceId,
  StatusBadge,
  FilterBar,
} from "@/components/design-system";
import { auditService, AuditLogItem } from "@/services/auditService";

function getHumanReadableDescription(log: AuditLogItem): string {
  try {
    const before = JSON.parse(log.oldValue || '{}');
    const after = JSON.parse(log.newValue || '{}');
    const name = after.AccountNumber || after.ReferenceNumber || log.entityType.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (after.Status && before.Status) return name + ' changed from ' + before.Status + ' to ' + after.Status + '.';
    return name + ' ' + log.action.toLowerCase() + '.';
  } catch { /* Older activity can omit structured details. */ }
  switch (log.action.toLowerCase()) {
    case "created":
      return `New ${log.entityType.toLowerCase()} was created.`;
    case "statuschanged":
      return `${log.entityType} status updated.`;
    case "reconciled":
      return `Account reconciliation completed.`;
    case "reversed":
      return `Transaction was reversed.`;
    default:
      return `${log.action} performed on ${log.entityType}.`;
  }
}

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await auditService.getLogs(undefined, undefined, 100);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setError(res.errors?.join(" ") || "Activity could not be loaded.");
      }
    } catch {
      setError("Activity could not be loaded. Your records have not been changed.");
    } finally {
      setLoading(false);
    }
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
    { value: "ALL", label: "All Activity", count: logs.length },
    { value: "Created", label: "Created", count: logs.filter((l) => l.action === "Created").length },
    { value: "Updated", label: "Updated", count: logs.filter((l) => l.action === "Updated").length },
    { value: "Reconciled", label: "Reconciled", count: logs.filter((l) => l.action === "Reconciled").length },
    { value: "Reversed", label: "Reversals", count: logs.filter((l) => l.action === "Reversed").length },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Activity &amp; Audit Log
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              See who changed accounts, payments, and workspace records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search activity by actor, entity ID, or description..."
          searchLabel="Search activity"
          statusFilter={actionFilter}
          onStatusChange={setActionFilter}
          statusOptions={actionOptions}
          resultCount={filteredLogs.length}
          totalCount={logs.length}
        />

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadLogs()}>Try again</Button>
          </div>
        )}

        {/* Audit Event Table */}
        <div className="border border-border/80 bg-card rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th scope="col" className="py-3 px-3.5 w-8"><span className="sr-only">Details</span></th>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Actor</th>
                <th className="py-3 px-3.5">Activity</th>
                <th className="py-3 px-3.5">Entity</th>
                <th className="py-3 px-3.5">Reference ID</th>
                <th className="py-3 px-3.5">Summary / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-3.5">
                      <div className="h-4 bg-muted rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const hasDetails = log.oldValue || log.newValue;
                  const description = getHumanReadableDescription(log);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                        className={`transition-colors ${
                          hasDetails ? "cursor-pointer hover:bg-muted/30" : ""
                        } ${isExpanded ? "bg-muted/20" : ""}`}
                      >
                        <td className="py-3 px-3 text-center text-muted-foreground">
                          {hasDetails && (
                            <button
                              type="button"
                              aria-label={`${isExpanded ? "Hide" : "Show"} details for ${description}`}
                              aria-expanded={isExpanded}
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpandedId(isExpanded ? null : log.id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3.5 font-medium text-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {log.performedBy}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <StatusBadge status={log.action} size="sm" showIcon={false} />
                        </td>
                        <td className="py-3 px-3.5 font-medium text-foreground">
                          {log.entityType}
                        </td>
                        <td className="py-3 px-3.5">
                          <MonospaceId id={log.entityId} truncateLength={8} />
                        </td>
                        <td className="py-3 px-3.5 text-muted-foreground truncate max-w-[280px]">
                          {description}
                        </td>
                      </tr>

                      {/* Expanded JSON Snapshot Diff */}
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={7} className="p-4 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                              <Code2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                              <span>Technical before / after details</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                              {log.oldValue && (
                                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                    Previous State
                                  </div>
                                  <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                                    {log.oldValue}
                                  </pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                                    Updated State
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
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-foreground text-sm">No activity recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No events match the selected filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
