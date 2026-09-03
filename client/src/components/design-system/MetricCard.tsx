import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { MoneyDisplay } from "./MoneyDisplay";

interface MetricCardProps {
  label: string;
  value: string | number;
  isMoney?: boolean;
  currency?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  isMoney = false,
  currency = "USD",
  subtitle,
  icon: Icon,
  iconColor = "text-emerald-500",
  trend,
  progress,
  className,
  onClick,
}: MetricCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "border border-border/80 bg-card text-foreground transition-all duration-200",
        onClick && "cursor-pointer hover:border-border hover:shadow-sm",
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            {label}
          </span>
          {Icon && (
            <div className="h-7 w-7 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center">
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
            {isMoney && typeof value === "number" ? (
              <MoneyDisplay amount={value} currency={currency} size="xl" />
            ) : (
              <span>{value}</span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {trend && (
          <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "font-mono font-bold text-[11px]",
                trend.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                trend.direction === "down" && "text-red-600 dark:text-red-400",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-muted-foreground text-[11px]">{trend.label}</span>
            )}
          </div>
        )}

        {progress && (
          <div className="pt-2 border-t border-border/50 space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>{progress.label || "Utilization"}</span>
              <span className="font-bold text-foreground">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
