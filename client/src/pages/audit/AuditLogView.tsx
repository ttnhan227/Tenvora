import React, { useEffect, useState, useMemo } from "react";
import { useLatestCallback } from "@/hooks/useLatestCallback";
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
import { PageHeader } from "@/components/business/BusinessUI";
import { useLanguage } from "@/contexts/LanguageContext";

function getHumanReadableDescription(log: AuditLogItem, isVietnamese = false): string {
  try {
    const before = JSON.parse(log.oldValue || '{}');
    const after = JSON.parse(log.newValue || '{}');
    const name = after.Name || after.SaleNumber || after.PurchaseNumber || log.entityType.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (after.Status && before.Status) return isVietnamese ? `${name} đổi từ ${before.Status} sang ${after.Status}.` : name + ' changed from ' + before.Status + ' to ' + after.Status + '.';
    return isVietnamese ? `${name}: ${log.action}.` : name + ' ' + log.action.toLowerCase() + '.';
  } catch { /* Older activity can omit structured details. */ }
  switch (log.action.toLowerCase()) {
    case "created":
      return isVietnamese ? `Đã tạo ${log.entityType}.` : `New ${log.entityType.toLowerCase()} was created.`;
    case "statuschanged":
      return isVietnamese ? `Đã cập nhật trạng thái ${log.entityType}.` : `${log.entityType} status updated.`;
    default:
      return isVietnamese ? `${log.action} trên ${log.entityType}.` : `${log.action} performed on ${log.entityType}.`;
  }
}

export default function AuditLogView() {
  const { isVietnamese } = useLanguage();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadLogs = useLatestCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await auditService.getLogs(undefined, undefined, 100);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setError(res.errors?.join(" ") || (isVietnamese ? "Không thể tải lịch sử hoạt động." : "Activity could not be loaded."));
      }
    } catch {
      setError(isVietnamese ? "Không thể tải lịch sử. Dữ liệu của bạn không bị thay đổi." : "Activity could not be loaded. Your records have not been changed.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => { void loadLogs(); }, [loadLogs]);

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
    { value: "ALL", label: isVietnamese ? "Tất cả hoạt động" : "All activity", count: logs.length },
    { value: "Created", label: isVietnamese ? "Đã tạo" : "Created", count: logs.filter((l) => l.action === "Created").length },
    { value: "Updated", label: isVietnamese ? "Đã cập nhật" : "Updated", count: logs.filter((l) => l.action === "Updated").length },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isVietnamese ? "Lịch sử ghi chép" : "Record history"}
          title={isVietnamese ? "Những thay đổi" : "What changed"}
          description={isVietnamese ? "Lịch sử người đã thêm hoặc sửa khách hàng, đơn bán, nhập hàng, thanh toán và các bản ghi kinh doanh." : "A dependable history of who added or changed customers, sales, purchases, payments, and business records."}
          actions={
            <Button
              variant="outline"
              onClick={loadLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {isVietnamese ? "Làm mới" : "Refresh"}
            </Button>
          }
        />

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isVietnamese ? "Tìm theo người thực hiện, mã hoặc mô tả..." : "Search activity by actor, entity ID, or description..."}
          searchLabel={isVietnamese ? "Tìm hoạt động" : "Search activity"}
          statusFilter={actionFilter}
          onStatusChange={setActionFilter}
          statusOptions={actionOptions}
          resultCount={filteredLogs.length}
          totalCount={logs.length}
        />

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadLogs()}>{isVietnamese ? "Thử lại" : "Try again"}</Button>
          </div>
        )}

        {/* Audit Event Table */}
        <div className="paper-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs tracking-wide font-bold">
                <th scope="col" className="py-3 px-3.5 w-8"><span className="sr-only">{isVietnamese ? "Chi tiết" : "Details"}</span></th>
                <th className="py-3 px-3.5">{isVietnamese ? "Thời gian" : "Timestamp"}</th>
                <th className="py-3 px-3.5">{isVietnamese ? "Người thực hiện" : "Actor"}</th>
                <th className="py-3 px-3.5">{isVietnamese ? "Hoạt động" : "Activity"}</th>
                <th className="py-3 px-3.5">{isVietnamese ? "Đối tượng" : "Entity"}</th>
                <th className="py-3 px-3.5">{isVietnamese ? "Mã tham chiếu" : "Reference ID"}</th>
                <th className="py-3 px-3.5">{isVietnamese ? "Tóm tắt / Ghi chú" : "Summary / Notes"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
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
                  const description = getHumanReadableDescription(log, isVietnamese);

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
                              aria-label={`${isExpanded ? (isVietnamese ? "Ẩn" : "Hide") : (isVietnamese ? "Hiện" : "Show")} ${isVietnamese ? "chi tiết" : "details for"} ${description}`}
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
                              <span>{isVietnamese ? "Chi tiết kỹ thuật trước / sau" : "Technical before / after details"}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                              {log.oldValue && (
                                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                    {isVietnamese ? "Trạng thái trước" : "Previous state"}
                                  </div>
                                  <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                                    {log.oldValue}
                                  </pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                                    {isVietnamese ? "Trạng thái sau" : "Updated state"}
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
                    <p className="font-semibold text-foreground text-sm">{isVietnamese ? "Chưa có hoạt động" : "No activity recorded"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isVietnamese ? "Không có sự kiện phù hợp với bộ lọc." : "No events match the selected filters."}
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
