import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, RotateCcw, XCircle } from "lucide-react";

export interface LifecycleStage {
  name: string;
  description?: string;
  timestamp?: string;
  status: "completed" | "current" | "pending" | "failed" | "reversed";
}

interface LifecycleStepperProps {
  stages: LifecycleStage[];
  className?: string;
}

export function LifecycleStepper({ stages, className }: LifecycleStepperProps) {
  return (
    <div className={cn("w-full py-2", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between relative gap-4 sm:gap-0">
        {/* Desktop connecting line behind step nodes */}
        <div className="hidden sm:block absolute left-4 right-4 top-3.5 h-[1px] bg-border z-0" />

        {stages.map((stage, idx) => {
          let nodeIcon = <Clock className="h-3 w-3 text-muted-foreground" />;
          let nodeStyle = "border-border bg-card text-muted-foreground";
          let labelColor = "text-muted-foreground";

          if (stage.status === "completed") {
            nodeIcon = <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />;
            nodeStyle = "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
            labelColor = "text-foreground font-semibold";
          } else if (stage.status === "current") {
            nodeIcon = <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />;
            nodeStyle = "border-blue-500 bg-blue-500/10 text-blue-600";
            labelColor = "text-foreground font-bold";
          } else if (stage.status === "reversed") {
            nodeIcon = <RotateCcw className="h-3 w-3 text-purple-600 dark:text-purple-400" />;
            nodeStyle = "border-purple-500/40 bg-purple-500/10 text-purple-600";
            labelColor = "text-purple-600 dark:text-purple-400 font-semibold";
          } else if (stage.status === "failed") {
            nodeIcon = <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />;
            nodeStyle = "border-red-500/40 bg-red-500/10 text-red-600";
            labelColor = "text-red-600 dark:text-red-400 font-semibold";
          }

          return (
            <div
              key={idx}
              className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-1.5 relative z-10 min-w-0 sm:flex-1"
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-full border flex items-center justify-center transition-colors shrink-0 shadow-2xs",
                  nodeStyle
                )}
              >
                {nodeIcon}
              </div>

              <div className="space-y-0.5 min-w-0">
                <p className={cn("text-xs font-mono uppercase tracking-wider truncate", labelColor)}>
                  {stage.name}
                </p>
                {stage.description && (
                  <p className="text-[10px] text-muted-foreground truncate hidden sm:block max-w-[130px] mx-auto">
                    {stage.description}
                  </p>
                )}
                {stage.timestamp && (
                  <p className="text-[9px] font-mono text-muted-foreground/80">
                    {new Date(stage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
