import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FloatingActionBarProps {
  selectedCount: number;
  onClear?: () => void;
  onClearSelection?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FloatingActionBar({
  selectedCount,
  onClear,
  onClearSelection,
  children,
  className,
}: FloatingActionBarProps) {
  const { t } = useLanguage();
  const handleClear = onClear ?? onClearSelection;

  if (selectedCount <= 0) return null;

  return (
    <aside
      role="region"
      aria-label="Bulk Actions"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-primary/20 bg-background/95 p-2.5 px-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2 pr-2 border-r border-border">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
          {selectedCount}
        </span>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          {t("items selected")}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={t("Clear selection")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {children}
      </div>
    </aside>
  );
}
