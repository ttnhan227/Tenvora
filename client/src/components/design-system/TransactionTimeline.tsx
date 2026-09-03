import React from "react";
import { Check, Clock, AlertCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  description?: string;
  timestamp?: string;
  status: "completed" | "current" | "pending" | "failed" | "reversed";
}

interface TransactionTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function TransactionTimeline({ steps, className }: TransactionTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isFailed = step.status === "failed";
          const isReversed = step.status === "reversed";

          return (
            <div key={index} className="relative group">
              {/* Marker Icon */}
              <div
                className={cn(
                  "absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center border text-[10px] transition-colors",
                  isCompleted && "bg-emerald-600 border-emerald-600 text-white",
                  isCurrent && "bg-background border-emerald-500 text-emerald-500 ring-2 ring-emerald-500/20",
                  isFailed && "bg-red-600 border-red-600 text-white",
                  isReversed && "bg-indigo-600 border-indigo-600 text-white",
                  step.status === "pending" && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                {isCurrent && <Clock className="h-3 w-3" />}
                {isFailed && <AlertCircle className="h-3 w-3 stroke-[3]" />}
                {isReversed && <RotateCcw className="h-3 w-3 stroke-[3]" />}
                {step.status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
              </div>

              {/* Step Content */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-xs font-bold leading-none",
                      isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
