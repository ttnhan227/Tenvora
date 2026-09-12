import React from "react";
import { Search, X, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: { value: string; label: string; count?: number }[];
  resultCount?: number;
  totalCount?: number;
  children?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  searchLabel = "Search records",
  statusFilter,
  onStatusChange,
  statusOptions,
  resultCount,
  totalCount,
  children,
  className,
}: FilterBarProps) {
  const hasActiveFilters = searchQuery !== "" || (statusFilter && statusFilter !== "ALL");

  const handleClear = () => {
    onSearchChange("");
    if (onStatusChange) onStatusChange("ALL");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            aria-label={searchLabel}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9 pr-9 text-xs bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-1 top-0.5 flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls & External Children */}
        <div className="flex items-center gap-2">
          {children}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-3 w-3" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Quick Status Filter Pills */}
      {statusOptions && onStatusChange && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {statusOptions.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusChange(opt.value)}
                className={cn(
                  "min-h-8 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border select-none inline-flex items-center gap-1.5",
                  active
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1 py-0.5 rounded",
                      active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
