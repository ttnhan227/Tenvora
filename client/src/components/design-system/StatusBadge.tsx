import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type RecordStatus = "Active" | "Disabled" | "Added" | "Modified" | "Deleted";

interface StatusBadgeProps {
  status: RecordStatus | string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = "sm",
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const { isVietnamese } = useLanguage();
  const norm = (status || "").toLowerCase().replace(/[\s_-]/g, "");

  let badgeStyle = "bg-secondary text-foreground/75 border-border";
  let dotColor = "bg-muted-foreground";
  let IconComponent: React.ComponentType<{ className?: string }> = Clock;

  if (["active", "added", "created"].includes(norm)) {
    badgeStyle = "bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/.25)]";
    dotColor = "bg-[hsl(var(--success))]";
    IconComponent = norm === "active" ? CheckCircle2 : Plus;
  } else if (["modified", "updated"].includes(norm)) {
    badgeStyle = "bg-[hsl(var(--info)/.1)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)]";
    dotColor = "bg-[hsl(var(--info))]";
    IconComponent = Pencil;
  } else if (["disabled", "deleted"].includes(norm)) {
    badgeStyle = "bg-destructive/10 text-destructive border-destructive/25";
    dotColor = "bg-destructive";
    IconComponent = norm === "deleted" ? Trash2 : XCircle;
  }

  const sizeClasses = {
    sm: "px-2.5 py-1 text-[11px] gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold select-none whitespace-nowrap",
        badgeStyle,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {showIcon && <IconComponent className="h-3 w-3 shrink-0 opacity-90" />}
      <span>{isVietnamese ? ({ active: "Đang hoạt động", disabled: "Đã vô hiệu hoá", added: "Đã thêm", created: "Đã tạo", modified: "Đã sửa", updated: "Đã cập nhật", deleted: "Đã xoá" }[norm] ?? status) : status}</span>
    </span>
  );
}
