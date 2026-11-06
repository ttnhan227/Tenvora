import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  Clock,
  PackageX,
  Receipt,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { businessService, DashboardAttentionItem } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

export interface NotificationPreferences {
  notifyStockouts: boolean;
  notifyBillsDue: boolean;
  notifyPendingDrafts: boolean;
  notifyCustomerOverdue: boolean;
}

const STORAGE_KEY = "tenvora_notification_prefs";

const defaultPrefs: NotificationPreferences = {
  notifyStockouts: true,
  notifyBillsDue: true,
  notifyPendingDrafts: true,
  notifyCustomerOverdue: true,
};

export interface ActionableNotificationsProps {
  onOpenReviewQueue?: () => void;
  onPaySupplier?: (metadata: any) => void;
}

export function ActionableNotifications({
  onOpenReviewQueue,
  onPaySupplier,
}: ActionableNotificationsProps) {
  const { t, isVietnamese } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"alerts" | "settings">("alerts");
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const savePrefs = (next: NotificationPreferences) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const { data: rawItems = [] } = useQuery({
    queryKey: ["dashboard-attention"],
    queryFn: () => businessService.getAttentionItems(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filteredItems = rawItems.filter((item) => {
    if (!prefs.notifyStockouts && (item.type === "out_of_stock" || item.type === "low_stock")) return false;
    if (!prefs.notifyBillsDue && item.type === "supplier_bill_due") return false;
    if (!prefs.notifyPendingDrafts && item.type === "pending_ai_actions") return false;
    if (!prefs.notifyCustomerOverdue && item.type === "customer_overdue") return false;
    return true;
  });

  const urgentCount = filteredItems.filter((i) => i.severity === "urgent").length;
  const count = filteredItems.length;

  const handleAction = (item: DashboardAttentionItem) => {
    setIsOpen(false);
    if (item.actionKey === "review_queue" && onOpenReviewQueue) {
      onOpenReviewQueue();
    } else if (item.actionKey === "pay_supplier" && onPaySupplier) {
      onPaySupplier(item.metadata);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label={t("notifications.title", undefined, "Notifications")}
        className="relative h-11 w-11 text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs ${
              urgentCount > 0 ? "bg-rose-600 animate-pulse" : "bg-amber-600"
            }`}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-0 rounded-2xl border-border bg-background shadow-2xl">
          <DialogHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Bell className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                {t("notifications.title", undefined, "Notifications")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("notifications.desc", undefined, "Actionable alerts and notification preferences")}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant={activeTab === "alerts" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("alerts")}
                className="h-7 text-xs font-semibold px-2.5"
              >
                {t("notifications.alerts", undefined, "Alerts")} ({count})
              </Button>
              <Button
                variant={activeTab === "settings" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("settings")}
                className="h-7 text-xs font-semibold px-2 gap-1"
                aria-label={t("notifications.settings", undefined, "Notification settings")}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </DialogHeader>

          {activeTab === "alerts" ? (
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-foreground">
                    {t("notifications.all_caught_up", undefined, "All caught up!")}
                  </p>
                  <p className="text-xs mt-1">
                    {t("notifications.no_alerts", undefined, "No urgent items requiring attention right now.")}
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                      item.severity === "urgent"
                        ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                        : item.severity === "warn"
                        ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                        : "border-border bg-card hover:bg-accent/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">{item.subtitle}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {item.actionRoute ? (
                        <Button
                          asChild
                          size="sm"
                          variant={item.severity === "urgent" ? "destructive" : "secondary"}
                          className="h-7 text-xs font-medium"
                          onClick={() => setIsOpen(false)}
                        >
                          <Link to={item.actionRoute}>{item.actionLabel || t("common.view", undefined, "View")}</Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={item.severity === "urgent" ? "destructive" : "secondary"}
                          className="h-7 text-xs font-medium"
                          onClick={() => handleAction(item)}
                        >
                          {item.actionLabel || t("common.action", undefined, "Action")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3 text-xs">
              <p className="text-muted-foreground font-medium">
                {t("notifications.config_desc", undefined, "Choose which actionable alerts appear in your notifications:")}
              </p>

              <label className="flex items-center justify-between p-2.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/40">
                <span className="font-semibold">{t("notifications.opt_stockouts", undefined, "Low stock & stockout alerts")}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyStockouts}
                  onChange={(e) => savePrefs({ ...prefs, notifyStockouts: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/40">
                <span className="font-semibold">{t("notifications.opt_bills", undefined, "Supplier bills due (within 3 days)")}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyBillsDue}
                  onChange={(e) => savePrefs({ ...prefs, notifyBillsDue: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/40">
                <span className="font-semibold">{t("notifications.opt_drafts", undefined, "Pending AI drafts awaiting review")}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyPendingDrafts}
                  onChange={(e) => savePrefs({ ...prefs, notifyPendingDrafts: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/40">
                <span className="font-semibold">{t("notifications.opt_customers", undefined, "Customer overdue balances")}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyCustomerOverdue}
                  onChange={(e) => savePrefs({ ...prefs, notifyCustomerOverdue: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>

              <div className="pt-2 flex justify-end">
                <Button size="sm" onClick={() => setActiveTab("alerts")} className="h-7 text-xs font-semibold">
                  {t("common.done", undefined, "Done")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
