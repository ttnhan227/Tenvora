import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, TrendingDown, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { businessService } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

export interface AiInsightCardProps {
  className?: string;
}

export function AiInsightCard({ className }: AiInsightCardProps) {
  const { t } = useLanguage();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: () => businessService.getDashboardInsights(),
    staleTime: 60_000,
  });

  const insights = (query.data ?? []).filter((i) => !dismissedIds.includes(i.id));

  if (query.isLoading || insights.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="relative flex items-start justify-between gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent p-4 px-5 shadow-sm"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {insight.trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : insight.trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-rose-500" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 pr-6 sm:pr-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {t("AI Insight")}
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground mt-0.5">
                {insight.headline}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {insight.detail}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleDismiss(insight.id)}
            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 absolute top-3 right-3 sm:relative sm:top-0 sm:right-0"
            title={t("Dismiss")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
