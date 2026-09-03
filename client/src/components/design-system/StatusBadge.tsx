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

  let badgeStyle = "bg-[#F4F5F7] text-[#4F5B76] border-[#E3E8EE] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:border-[#334155]";
  let dotColor = "bg-[#697386]";
  let IconComponent: React.ComponentType<{ className?: string }> = Clock;

  if (["posted", "passed", "active", "approved", "resolved", "low", "completed"].includes(norm)) {
    badgeStyle = "bg-[#EBFBF3] text-[#0E6251] border-[#A3E6CD] dark:bg-[#064E3B]/30 dark:text-[#6EE7B7] dark:border-[#059669]/40";
    dotColor = "bg-[#00D924]";
    IconComponent = CheckCircle2;
  } else if (["settled", "open"].includes(norm)) {
    badgeStyle = "bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] dark:border-[#6366F1]/40";
    dotColor = "bg-[#635BFF]";
    IconComponent = ShieldCheck;
  } else if (["pending", "processing", "medium", "flaggedforreview", "investigate"].includes(norm)) {
    badgeStyle = "bg-[#FFF8EB] text-[#8F5B00] border-[#FFE1A8] dark:bg-[#78350F]/30 dark:text-[#FCD34D] dark:border-[#D97706]/40";
    dotColor = "bg-[#F5A623]";
    IconComponent = Clock;
  } else if (["reversed"].includes(norm)) {
    badgeStyle = "bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE] dark:bg-[#4C1D95]/30 dark:text-[#D8B4FE] dark:border-[#8B5CF6]/40";
    dotColor = "bg-[#7F56D9]";
    IconComponent = RotateCcw;
  } else if (["failed", "mismatch", "disabled", "rejected", "critical", "high"].includes(norm)) {
    badgeStyle = "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] dark:bg-[#7F1D1D]/30 dark:text-[#FCA5A5] dark:border-[#DC2626]/40";
    dotColor = "bg-[#DF1B41]";
    IconComponent = norm === "critical" || norm === "high" ? ShieldAlert : XCircle;
  } else if (["debit"].includes(norm)) {
    badgeStyle = "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] dark:bg-[#14532D]/30 dark:text-[#86EFAC] dark:border-[#22C55E]/40";
    dotColor = "bg-[#22C55E]";
    IconComponent = CheckCircle2;
  } else if (["credit"].includes(norm)) {
    badgeStyle = "bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] dark:border-[#6366F1]/40";
    dotColor = "bg-[#635BFF]";
    IconComponent = CheckCircle2;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono font-semibold uppercase tracking-wider select-none whitespace-nowrap",
        badgeStyle,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {showIcon && <IconComponent className="h-3 w-3 shrink-0 opacity-80" />}
      <span>{status}</span>
    </span>
  );
}
