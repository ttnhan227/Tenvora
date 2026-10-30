import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CheckSquare,
  Inbox,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  captureService,
  CaptureResult,
} from "@/services/captureService";
import { CaptureSheet } from "@/components/business/CaptureSheet";

export default function ReviewQueuePage() {
  const { t, formatCurrency } = useLanguage();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDraft, setActiveDraft] = useState<CaptureResult | null>(null);
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const query = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const res = await captureService.getReviewQueue();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const queue = query.data ?? [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === queue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(queue.map((item) => item.actionId));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);

    const res = await captureService.bulkApprove(selectedIds);
    if (res.success && res.data) {
      toast({
        title: t("queue.bulk_approved", { 0: res.data.approvedCount }, "Approved {0} drafts"),
        description: res.data.failedCount > 0
          ? t("queue.bulk_failed", { 0: res.data.failedCount }, "{0} drafts could not be confirmed.")
          : undefined,
      });
      setSelectedIds([]);
      query.refetch();
    } else {
      toast({
        title: t("queue.bulk_error", undefined, "Bulk approval failed"),
        description: res.errors?.[0],
        variant: "destructive",
      });
    }

    setIsBulkApproving(false);
  };

  const handleReject = async (actionId: string) => {
    const res = await captureService.rejectDraft(actionId);
    if (res.success) {
      toast({
        title: t("capture.draft_discarded", undefined, "Draft discarded"),
      });
      query.refetch();
    }
  };

  const openReview = (draft: CaptureResult) => {
    setActiveDraft(draft);
    setCaptureSheetOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("AI Staged Proposals")}
          title={t("queue.title", undefined, "Review Queue")}
          description={t("queue.subtitle", undefined, "Pending AI proposals awaiting your confirmation. Nothing moves money or stock until you approve.")}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
                disabled={query.isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${query.isLoading ? "animate-spin" : ""}`} />
                {t("common.refresh", undefined, "Refresh")}
              </Button>
            </div>
          }
        />

        {queue.length > 0 && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.length === queue.length && queue.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {selectedIds.length > 0
                  ? t("queue.selected_count", { 0: selectedIds.length }, "{0} selected")
                  : t("common.select_all", undefined, "Select all")}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={selectedIds.length === 0 || isBulkApproving}
                onClick={handleBulkApprove}
                className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {isBulkApproving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                {t("queue.approve_selected", { 0: selectedIds.length }, "Approve Selected ({0})")}
              </Button>
            </div>
          </div>
        )}

        {query.isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t("queue.loading", undefined, "Loading review queue...")}
            </p>
          </div>
        ) : queue.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-muted/10 border border-border rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base">
                {t("queue.all_caught_up", undefined, "All caught up!")}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {t("queue.no_pending", undefined, "There are no pending drafts requiring your confirmation right now.")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => {
              const isSelected = selectedIds.includes(item.actionId);
              const isHighConfidence = (item.draft.provenance?.overallConfidence || 0.9) >= 0.85;

              return (
                <div
                  key={item.actionId}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-primary/5 border-primary/40 shadow-sm"
                      : "bg-background border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.actionId)}
                      className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                          {item.intent === "purchase" ? t("nav.purchases", undefined, "Purchase") : t("nav.expenses", undefined, "Expense")}
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {item.draft.vendor || item.draft.category || "General Draft"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isHighConfidence
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {Math.round((item.draft.provenance?.overallConfidence || 0.9) * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>
                          {item.draft.date ? new Date(item.draft.date).toLocaleDateString() : new Date().toLocaleDateString()}
                        </span>
                        {item.draft.lineItems.length > 0 && (
                          <span>• {item.draft.lineItems.length} {t("capture.items", undefined, "items")}</span>
                        )}
                        {item.duplicate?.isDuplicate && (
                          <span className="text-amber-500 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t("capture.possible_duplicate", undefined, "Duplicate alert")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                    <div className="text-right">
                      <span className="block font-mono font-bold text-base text-foreground">
                        {formatCurrency(item.draft.totalAmount, item.draft.currency)}
                      </span>
                      {item.draft.paidAmount > 0 && (
                        <span className="block text-[11px] text-muted-foreground">
                          {t("common.paid", undefined, "Paid")}: {formatCurrency(item.draft.paidAmount, item.draft.currency)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReview(item)}
                        className="h-8 text-xs font-semibold"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        {t("common.review", undefined, "Review")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(item.actionId)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CaptureSheet
        open={captureSheetOpen}
        onOpenChange={(v) => {
          setCaptureSheetOpen(v);
          if (!v) query.refetch();
        }}
        initialResult={activeDraft}
        onConfirmed={() => {
          query.refetch();
          setCaptureSheetOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
