import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export type FinancialStatus =
  | "Posted"
  | "Settled"
  | "Pending"
  | "Processing"
  | "Reversed"
  | "Failed"
  | "Passed"
  | "Mismatch"
  | "Investigate"
  | "Resolved"
  | "Active"
  | "Disabled"
  | "Debit"
  | "Credit"
  | "Low"
  | "Medium"
  | "High"
  | "Critical"
  | "Approved"
  | "FlaggedForReview"
  | "Rejected";

interface StatusBadgeProps {
  status: FinancialStatus | string;
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
  const norm = (status || "").toLowerCase().replace(/[\s_-]/g, "");

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
  let dotColor = "bg-slate-400";
  let IconComponent: React.ComponentType<{ className?: string }> = Clock;

  if (["posted", "passed", "active", "approved", "resolved", "low", "completed", "settled"].includes(norm)) {
    badgeStyle = "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50";
    dotColor = "bg-emerald-500";
    IconComponent = CheckCircle2;
  } else if (["sent", "open"].includes(norm)) {
    badgeStyle = "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50";
    dotColor = "bg-blue-500";
    IconComponent = ShieldCheck;
  } else if (["pending", "processing", "medium", "flaggedforreview", "investigate"].includes(norm)) {
    badgeStyle = "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50";
    dotColor = "bg-amber-500";
    IconComponent = Clock;
  } else if (["reversed"].includes(norm)) {
    badgeStyle = "bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50";
    dotColor = "bg-purple-500";
    IconComponent = RotateCcw;
  } else if (["failed", "mismatch", "disabled", "rejected", "critical", "high", "overdue"].includes(norm)) {
    badgeStyle = "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50";
    dotColor = "bg-rose-500";
    IconComponent = norm === "critical" || norm === "high" ? ShieldAlert : XCircle;
  } else if (["debit"].includes(norm)) {
    badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
    dotColor = "bg-slate-500";
    IconComponent = Clock;
  } else if (["credit"].includes(norm)) {
    badgeStyle = "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50";
    dotColor = "bg-emerald-500";
    IconComponent = CheckCircle2;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-mono font-semibold uppercase tracking-wider select-none whitespace-nowrap",
        badgeStyle,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {showIcon && <IconComponent className="h-3 w-3 shrink-0 opacity-90" />}
      <span>{status}</span>
    </span>
  );
}
