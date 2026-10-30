import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  PackageOpen,
  PackageX,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  businessService,
  DashboardAttentionItem,
} from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

export interface AttentionFeedProps {
  onPaySupplier?: (metadata: any) => void;
  onOpenReviewQueue?: () => void;
  className?: string;
}

export function AttentionFeed({ onPaySupplier, onOpenReviewQueue, className }: AttentionFeedProps) {
  const { t, isVietnamese } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const query = useQuery({
    queryKey: ["dashboard-attention"],
    queryFn: () => businessService.getAttentionItems(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const rawItems = query.data ?? [];

  // Sort by severity: urgent first, then warn, then info
  const sortedItems = [...rawItems].sort((a, b) => {
    const score = (sev: string) => (sev === "urgent" ? 3 : sev === "warn" ? 2 : 1);
    return score(b.severity) - score(a.severity);
  });

  const displayedItems = showAll ? sortedItems : sortedItems.slice(0, 5);

  const renderIcon = (type: string, severity: string) => {
    const cls = cn(
      "h-5 w-5 shrink-0",
      severity === "urgent"
        ? "text-rose-600 dark:text-rose-400"
        : severity === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-sky-600 dark:text-sky-400"
    );

    switch (type) {
      case "out_of_stock":
        return <PackageX className={cls} />;
      case "low_stock":
        return <PackageOpen className={cls} />;
      case "pending_ai_actions":
        return <Sparkles className={cls} />;
      case "supplier_bill_due":
        return <WalletCards className={cls} />;
      case "customer_overdue":
        return <Users className={cls} />;
      case "unusual_activity":
        return <TrendingUp className={cls} />;
      default:
        return <AlertTriangle className={cls} />;
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case "urgent":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {t("Urgent")}
          </span>
        );
      case "warn":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t("Attention")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
            {t("Notice")}
          </span>
        );
    }
  };

  return (
    <section
      aria-label="Action required feed"
      className={cn("paper-card overflow-hidden border border-border/80 shadow-sm", className)}
    >
      <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/20">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>{t("Needs attention")}</span>
            {rawItems.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
                {rawItems.length}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {rawItems.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-semibold h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              {showAll ? t("Show less") : `${t("Show all")} (${rawItems.length})`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={t("Refresh")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          {t("Checking what needs your attention today…")}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-500/[0.03]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="font-bold text-foreground">{t("All caught up")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
            {t("No stockouts, overdue bills, or pending drafts need your review right now.")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-5 transition-colors hover:bg-muted/30",
                item.severity === "urgent" && "bg-rose-500/[0.02]"
              )}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    item.severity === "urgent"
                      ? "border-rose-500/25 bg-rose-500/10"
                      : item.severity === "warn"
                      ? "border-amber-500/25 bg-amber-500/10"
                      : "border-sky-500/25 bg-sky-500/10"
                  )}
                >
                  {renderIcon(item.type, item.severity)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-foreground truncate">
                      {item.title}
                    </p>
                    {severityBadge(item.severity)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center sm:shrink-0 self-end sm:self-center">
                {item.type === "pending_ai_actions" && onOpenReviewQueue ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenReviewQueue}
                    className="gap-1.5 text-xs font-bold h-8 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <span>{t(item.actionLabel)}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : item.actionKey === "pay_supplier" && onPaySupplier ? (
                  <Button
                    size="sm"
                    variant={item.severity === "urgent" ? "default" : "outline"}
                    onClick={() => onPaySupplier(item.metadata)}
                    className={cn(
                      "gap-1.5 text-xs font-bold h-8",
                      item.severity === "urgent" && "bg-rose-600 hover:bg-rose-700 text-white"
                    )}
                  >
                    <span>{t(item.actionLabel)}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : item.actionRoute ? (
                  <Button
                    asChild
                    size="sm"
                    variant={item.severity === "urgent" ? "default" : "outline"}
                    className={cn(
                      "gap-1.5 text-xs font-bold h-8",
                      item.severity === "urgent" && "bg-rose-600 hover:bg-rose-700 text-white"
                    )}
                  >
                    <Link to={item.actionRoute}>
                      <span>{t(item.actionLabel)}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs font-bold h-8">
                    {t(item.actionLabel)}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
