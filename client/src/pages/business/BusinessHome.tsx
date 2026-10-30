import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  CircleDollarSign,
  ChevronDown,
  ChevronUp,
  Package,
  PackageOpen,
  Plus,
  Receipt,
  ReceiptText,
  ShoppingBasket,
  TrendingUp,
  Users,
  WalletCards,
  Sparkles,
  FileText,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, MoneyCard, PageHeader } from "@/components/business/BusinessUI";
import { GettingStartedGuide } from "@/components/business/GettingStartedGuide";
import { BusinessReportModal } from "@/components/business/BusinessReportModal";
import { AttentionFeed } from "@/components/business/AttentionFeed";
import { AiInsightCard } from "@/components/business/AiInsightCard";
import { SupplierPaymentModal } from "@/components/business/SupplierPaymentModal";
import { CaptureSheet } from "@/components/business/CaptureSheet";
import { ReviewQueueModal } from "@/components/business/ReviewQueueModal";
import { captureService } from "@/services/captureService";
import { Button } from "@/components/ui/button";
import { businessMoney, businessService } from "@/services/businessService";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessPermissions } from "@/hooks/useBusinessPermissions";
import { getProfileOrDefault, BusinessType } from "@/data/businessProfiles";

export default function BusinessHome() {
  const { user } = useAuth();
  const { t, isVietnamese } = useLanguage();
  const { canManageRecords } = useBusinessPermissions();
  const [period, setPeriod] = useState<string>("today");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<{
    id?: string;
    name?: string;
    outstandingBalance?: number;
  } | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);

  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const res = await captureService.getReviewQueue();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 15_000,
  });

  const query = useQuery({
    queryKey: ["business-dashboard", period],
    queryFn: () => businessService.getDashboard(period),
  });
  const data = query.data;
  const currency = data?.currency ?? user?.preferredCurrency ?? "USD";
  const firstName = user?.email?.split("@")[0]?.split(/[._-]/)[0];
  const displayName = user?.fullName || capitalize(firstName) || t("there");
  const profile = getProfileOrDefault(user?.businessType as BusinessType);

  const hasActivity = Boolean(
    data &&
      (data.todaySales > 0 ||
        data.recentActivity.length > 0 ||
        data.outstandingCustomers > 0 ||
        data.outstandingSuppliers > 0)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 1. GREETING & HEADER */}
        <PageHeader
          eyebrow={t("Today at a glance")}
          title={isVietnamese ? `Xin chào, ${displayName}` : `Good ${greeting()}, ${displayName}`}
          description={
            isVietnamese
              ? `Tình hình kinh doanh hôm nay tại ${user?.companyName || "cửa hàng của bạn"}.`
              : `Here’s what is happening at ${user?.companyName || "your business"} today.`
          }
          actions={
            <>
              <Button asChild variant="outline" className="items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-bold">
                <Link to="/agent">
                  <Sparkles className="h-4 w-4" />
                  <span>{t("AI Assistant")}</span>
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setReportModalOpen(true)} className="items-center gap-1.5 font-bold">
                <FileText className="h-4 w-4 text-primary" />
                <span>{t("Report")}</span>
              </Button>
            </>
          }
        />

        {!hasActivity && canManageRecords && (
          <GettingStartedGuide
            companyName={user?.companyName || t("Your business")}
            currency={currency}
            businessType={user?.businessType}
            hasActivity={false}
          />
        )}

        {query.isLoading ? (
          <LoadingState label={t("Opening today's business…")} />
        ) : query.isError ? (
          <section role="alert" className="paper-card border-destructive/25 p-6">
            <h2 className="font-bold">{t("We couldn’t open today’s records.")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Your data is safe. Check the connection and try again.")}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
              {t("Try again")}
            </Button>
          </section>
        ) : (
          data && (
            <>
              {/* 2. HEADLINE CASH POSITION & PERIOD SELECTOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("Financial position")}
                  </span>
                  <div className="inline-flex rounded-xl border bg-muted/30 p-1">
                    {(["today", "week", "month", "all"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        className={cn(
                          "rounded-lg px-3.5 py-1 text-xs font-semibold transition-all",
                          period === p
                            ? "bg-card text-foreground shadow-sm font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {p === "today"
                          ? t("Today")
                          : p === "week"
                          ? t("This Week")
                          : p === "month"
                          ? t("This Month")
                          : t("All Time")}
                      </button>
                    ))}
                  </div>
                </div>

                <section aria-label="Headline Cash Position" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <MoneyCard
                    featured
                    label={t("Money received")}
                    value={businessMoney(data.periodPayments ?? data.todayPayments, currency)}
                    detail={
                      (data.periodPayments ?? data.todayPayments) > 0
                        ? `${businessMoney(data.periodSales ?? data.todaySales, currency)} ${t("sales billed")}`
                        : t("No payments received yet")
                    }
                    icon={ArrowDownToLine}
                    tone="good"
                  />
                  <MoneyCard
                    label={t("Net profit")}
                    value={businessMoney(data.periodNetProfit ?? 0, currency)}
                    detail={t("Sales - (Expenses + Purchases)")}
                    icon={TrendingUp}
                    tone={(data.periodNetProfit ?? 0) >= 0 ? "good" : "out"}
                  />
                  <MoneyCard
                    label={t("Customers owe you")}
                    value={businessMoney(data.outstandingCustomers, currency)}
                    detail={
                      data.outstandingCustomers > 0
                        ? `${data.unpaidCustomers.length} ${t("unpaid accounts")}`
                        : t("All customer accounts settled")
                    }
                    icon={Users}
                    tone={data.outstandingCustomers > 0 ? "attention" : "plain"}
                  />
                  <MoneyCard
                    label={t("You owe suppliers")}
                    value={businessMoney(data.outstandingSuppliers, currency)}
                    detail={
                      data.outstandingSuppliers > 0
                        ? t("Outstanding purchase bills")
                        : t("All supplier bills paid")
                    }
                    icon={CircleDollarSign}
                    tone={data.outstandingSuppliers > 0 ? "out" : "good"}
                  />
                </section>
              </div>

              {/* 3. ATTENTION FEED (Priority actions, max 5, show all) */}
              <AttentionFeed
                onPaySupplier={(meta) => {
                  setPayingSupplier({
                    id: meta?.supplierId,
                    name: meta?.supplierName,
                    outstandingBalance: meta?.outstandingBalance,
                  });
                }}
                onOpenReviewQueue={() => setReviewQueueOpen(true)}
              />

              {/* 4. DETERMINISTIC AI INSIGHTS */}
              <AiInsightCard />

              {/* 5. QUICK ACTIONS */}
              {canManageRecords && (
                <section aria-label="Quick Actions" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {t("Quick actions")}
                    </h2>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {isVietnamese ? t(`profile.${profile.type}`) : profile.shortLabel}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button
                      asChild
                      size="lg"
                      className="h-14 justify-start gap-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm font-bold text-sm"
                    >
                      <Link to="/sales?create=1">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                          <Plus className="h-5 w-5" />
                        </span>
                        <div className="text-left">
                          <p className="font-bold">{t("New sale")}</p>
                          <p className="text-xs text-white/80 font-normal">{t("Issue receipt or invoice")}</p>
                        </div>
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setCaptureOpen(true)}
                      className="h-14 justify-start gap-3 rounded-2xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-bold text-sm"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Camera className="h-5 w-5" />
                      </span>
                      <div className="text-left">
                        <p className="font-bold">{t("Scan invoice")}</p>
                        <p className="text-xs text-muted-foreground font-normal">{t("Photo or text to draft")}</p>
                      </div>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-14 justify-start gap-3 rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-sm"
                    >
                      <Link to="/expenses?create=1">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          <Receipt className="h-5 w-5" />
                        </span>
                        <div className="text-left">
                          <p className="font-bold">{t("Add expense")}</p>
                          <p className="text-xs text-muted-foreground font-normal">{t("Record business cost")}</p>
                        </div>
                      </Link>
                    </Button>
                  </div>
                </section>
              )}

              {/* 6. COLLAPSIBLE RECENT ACTIVITY & DETAILED LEDGER */}
              <div className="rounded-2xl border bg-card/60 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActivityExpanded((prev) => !prev)}
                  className="flex w-full items-center justify-between p-4 px-5 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={activityExpanded}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBasket className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">
                      {t("Recent activity & records")}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {data.recentActivity.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <span>{activityExpanded ? t("Hide activity") : t("Show activity")}</span>
                    {activityExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {activityExpanded && (
                  <div className="border-t p-5 sm:p-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                      {/* Recent Activity List */}
                      <div className="paper-card overflow-hidden">
                        <div className="border-b px-5 py-3">
                          <h3 className="text-sm font-bold">{t("Recent transactions")}</h3>
                        </div>
                        {data.recentActivity.length === 0 ? (
                          <div className="p-6">
                            <EmptyState
                              compact
                              icon={ShoppingBasket}
                              title={t("No activity yet today")}
                              description={t("Record a sale, purchase, or expense and it will appear here.")}
                            />
                          </div>
                        ) : (
                          <div className="divide-y max-h-96 overflow-y-auto">
                            {data.recentActivity.map((activity) => (
                              <div
                                key={`${activity.type}-${activity.id}`}
                                className="flex items-center gap-4 px-5 py-3 text-sm"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                                  {activityIcon(activity.type)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-bold">{activity.title}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {friendlyType(activity.type, isVietnamese)} · {activity.detail}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="tabular-nums font-bold">
                                    {businessMoney(activity.amount, currency)}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {friendlyDate(activity.occurredAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tailored Profile Quick Links & Outstanding Summaries */}
                      <div className="space-y-4">
                        <div className="paper-card p-5">
                          <h3 className="text-sm font-bold">{t("Business profiles & library")}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(profile.tagline || "Track and view business records")}
                          </p>
                          <div className="mt-3.5 grid gap-2">
                            {profile.quickActions.map((action) => {
                              const Icon = getActionIcon(action.iconName);
                              return (
                                <QuickLink
                                  key={action.to + action.label}
                                  to={action.to}
                                  icon={Icon}
                                  label={t(action.label)}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {data.outstandingCustomers > 0 && (
                          <div className="paper-card bg-primary/5 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-primary">{t("Customers owe you")}</p>
                                <p className="tabular-nums text-lg font-bold text-foreground">
                                  {businessMoney(data.outstandingCustomers, currency)}
                                </p>
                              </div>
                              <Button asChild size="sm" variant="ghost">
                                <Link to="/customers?debt=has_debt" className="gap-1 text-xs">
                                  <span>{t("See balances")}</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}

                        {data.outstandingSuppliers > 0 && (
                          <div className="paper-card bg-amber-500/10 p-4 border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                                  {t("You owe suppliers")}
                                </p>
                                <p className="tabular-nums text-lg font-bold text-foreground">
                                  {businessMoney(data.outstandingSuppliers, currency)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPayingSupplier({})}
                                className="text-xs font-bold border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
                              >
                                {t("Pay")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unpaid customers list if any */}
                    {data.unpaidCustomers.length > 0 && (
                      <div className="pt-2">
                        <div className="mb-3 flex items-end justify-between">
                          <div>
                            <h3 className="text-sm font-bold">{t("Customers to follow up")}</h3>
                            <p className="text-xs text-muted-foreground">{t("People with an unpaid balance")}</p>
                          </div>
                          <Button asChild variant="ghost" size="sm" className="text-xs">
                            <Link to="/customers">{t("common.viewAll")}</Link>
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {data.unpaidCustomers.slice(0, 6).map((customer) => (
                            <Link
                              key={customer.id}
                              to={`/customers/${customer.id}`}
                              className="paper-card friendly-focus flex items-center justify-between gap-3 p-3.5 transition-colors hover:border-primary/35 hover:bg-accent/20"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {isVietnamese
                                    ? `${customer.salesCount} đơn bán`
                                    : `${customer.salesCount} sale${customer.salesCount === 1 ? "" : "s"}`}
                                </p>
                              </div>
                              <p className="tabular-nums text-sm font-bold text-amber-800 dark:text-amber-300">
                                {businessMoney(customer.outstandingBalance, customer.currency)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>

      <BusinessReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        defaultPeriod={period === "all" ? "all" : "month"}
      />

      {payingSupplier && (
        <SupplierPaymentModal
          open={Boolean(payingSupplier)}
          onOpenChange={(open) => {
            if (!open) setPayingSupplier(null);
          }}
          supplierId={payingSupplier.id}
          supplierName={payingSupplier.name}
          maxAmount={payingSupplier.outstandingBalance}
          currency={currency}
          onSuccess={() => {
            query.refetch();
          }}
        />
      )}

      <CaptureSheet
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onConfirmed={() => {
          query.refetch();
          queueQuery.refetch();
        }}
      />

      <ReviewQueueModal
        open={reviewQueueOpen}
        onOpenChange={setReviewQueueOpen}
        queue={queueQuery.data ?? []}
        isLoading={queueQuery.isLoading}
        onRefresh={() => {
          queueQuery.refetch();
          query.refetch();
        }}
      />
    </DashboardLayout>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof ReceiptText;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="friendly-focus flex min-h-11 items-center gap-3 rounded-xl border bg-card px-3.5 text-sm font-bold transition-colors hover:border-primary/35 hover:bg-accent/35"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="flex-1 text-xs sm:text-sm">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function getActionIcon(iconName: string): typeof ReceiptText {
  switch (iconName) {
    case "Package":
      return Package;
    case "PackageOpen":
      return PackageOpen;
    case "Users":
      return Users;
    case "WalletCards":
      return WalletCards;
    case "Receipt":
      return Receipt;
    case "ReceiptText":
    default:
      return ReceiptText;
  }
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

function capitalize(value?: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function friendlyDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function friendlyType(type: string, isVietnamese: boolean) {
  if (!isVietnamese) return type.replace(/([a-z])([A-Z])/g, "$1 $2");
  const normalized = type.toLowerCase();
  if (normalized.includes("sale")) return "Đơn bán";
  if (normalized.includes("purchase")) return "Nhập hàng";
  if (normalized.includes("expense")) return "Khoản chi";
  if (normalized.includes("payment")) return "Thanh toán";
  return type;
}

function activityIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("sale")) return <ReceiptText size={18} />;
  if (normalized.includes("purchase")) return <PackageOpen size={18} />;
  if (normalized.includes("expense")) return <Receipt size={18} />;
  return <WalletCards size={18} />;
}
