import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  sortAccessor?: (item: T) => string | number | Date;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (allSelected: boolean) => void;
  pageSize?: number;
  className?: string;
  hoverable?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries matching the current operational parameters.",
  emptyAction,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  pageSize = 15,
  className,
  hoverable = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.sortable) return data;

    return [...data].sort((a, b) => {
      const valA = col.sortAccessor ? col.sortAccessor(a) : (a as any)[sortKey];
      const valB = col.sortAccessor ? col.sortAccessor(b) : (b as any)[sortKey];

      if (valA == null && valB == null) return 0;
      if (valA == null) return sortDirection === "asc" ? -1 : 1;
      if (valB == null) return sortDirection === "asc" ? 1 : -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === "asc" ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sortKey, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize <= 0) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const isAllSelected =
    selectedIds &&
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedIds.includes(keyExtractor(item)));

  return (
    <div className={cn("border border-border/90 bg-card rounded-md shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)] overflow-hidden flex flex-col justify-between", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-[#FAFBFC] dark:bg-[#0E1A2E] text-muted-foreground uppercase text-[10px] tracking-wider font-mono select-none">
              {onToggleSelect && (
                <th className="py-2 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={!!isAllSelected}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                    className="rounded border-border text-[#635BFF] focus:ring-[#635BFF] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left";

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    className={cn(
                      "py-2.5 px-3.5 font-bold transition-colors whitespace-nowrap text-[#4F5B76] dark:text-[#94A3B8]",
                      alignClass,
                      col.sortable && "cursor-pointer hover:text-foreground hover:bg-[#F0F3F7] dark:hover:bg-[#1E293B]",
                      col.headerClassName
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "right" && "justify-end",
                        col.align === "center" && "justify-center"
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="opacity-70 text-[10px]">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="h-3 w-3 text-[#635BFF]" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-[#635BFF]" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-sans">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {onToggleSelect && <td className="py-2.5 px-3"><div className="h-3.5 w-3.5 bg-muted rounded" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="py-2.5 px-3.5">
                      <div className={cn("h-3.5 bg-muted rounded", col.align === "right" ? "ml-auto w-16" : "w-24")} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds?.includes(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={cn(
                      "transition-colors duration-100",
                      hoverable && "hover:bg-[#F8FAFC] dark:hover:bg-[#13233A]",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-[#635BFF]/5"
                    )}
                  >
                    {onToggleSelect && (
                      <td
                        className="py-2 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => onToggleSelect(id)}
                          className="rounded border-border text-[#635BFF] focus:ring-[#635BFF] h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const alignClass =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left";

                      return (
                        <td
                          key={col.key}
                          className={cn("py-2.5 px-3.5 text-xs text-foreground", alignClass, col.className)}
                        >
                          {col.render ? col.render(item) : (item as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (onToggleSelect ? 1 : 0)}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-semibold text-foreground text-xs">{emptyTitle}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{emptyDescription}</p>
                    {emptyAction && <div className="pt-2">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > pageSize && (
        <div className="px-3.5 py-2 border-t border-border bg-[#FAFBFC] dark:bg-[#0E1A2E] flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-6 px-2 text-[10px] font-mono border-border bg-card"
            >
              <ChevronLeft className="h-3 w-3 mr-0.5" />
              Prev
            </Button>
            <span className="px-2 font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-6 px-2 text-[10px] font-mono border-border bg-card"
            >
              Next
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
