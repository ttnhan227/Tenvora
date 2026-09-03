import React from "react";
import { ShieldCheck, AlertTriangle, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "./MoneyDisplay";
import { cn } from "@/lib/utils";

interface BalanceGaugeProps {
  leftLabel: string;
  leftAmount: number;
  rightLabel: string;
  rightAmount: number;
  currency?: string;
  title?: string;
  className?: string;
}

export function BalanceGauge({
  leftLabel,
  leftAmount,
  rightLabel,
  rightAmount,
  currency = "USD",
  title = "Double-Entry Balance Invariant",
  className,
}: BalanceGaugeProps) {
  const variance = Math.abs(leftAmount - rightAmount);
  const isBalanced = variance < 0.001;

  return (
    <Card
      className={cn(
        "border transition-colors",
        isBalanced
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
          : "border-red-500/40 bg-red-500/5 dark:bg-red-950/10",
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center border",
                isBalanced
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400"
              )}
            >
              {isBalanced ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{title}</p>
              <p className="text-[11px] text-muted-foreground">
                {isBalanced
                  ? "Strict Zero-Variance Mathematical Equivalence"
                  : `Discrepancy Detected: Variance of $${variance.toFixed(2)}`}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border",
              isBalanced
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
            )}
          >
            {isBalanced ? "100% Balanced" : "Variance Alert"}
          </div>
        </div>

        {/* Comparison Rails */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="p-3 rounded-lg bg-card border border-border/70 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              {leftLabel}
            </span>
            <div>
              <MoneyDisplay amount={leftAmount} currency={currency} size="lg" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-card border border-border/70 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              {rightLabel}
            </span>
            <div>
              <MoneyDisplay amount={rightAmount} currency={currency} size="lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
