import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold tracking-tight transition-colors border tabular-nums",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground",
        secondary: "border-border/60 bg-muted text-muted-foreground",
        signal: "border-[hsl(var(--accent-signal))] bg-[hsl(var(--accent-signal))] text-[hsl(var(--accent-signal-fg))] font-bold",
        success: "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium",
        warning: "border-amber-600/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium",
        destructive: "border-red-600/20 bg-red-500/10 text-red-700 dark:text-red-400 font-semibold",
        outline: "border-border text-muted-foreground bg-transparent",
        high: "border-red-600/25 bg-red-500/10 text-red-700 dark:text-red-400 font-bold",
        medium: "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium",
        low: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
