import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  CircleDollarSign,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, MoneyCard, PageHeader } from "@/components/business/BusinessUI";
import { GettingStartedGuide } from "@/components/business/GettingStartedGuide";
import { BusinessReportModal } from "@/components/business/BusinessReportModal";
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

  const query = useQuery({
    queryKey: ["business-dashboard", period],
    queryFn: () => businessService.getDashboard(period),
  });
  const data = query.data;
  const currency = data?.currency ?? user?.preferredCurrency ?? "USD";
  const firstName = user?.email?.split("@")[0]?.split(/[._-]/)[0];
  const displayName = user?.fullName || capitalize(firstName) || (isVietnamese ? "bạn" : "there");
  const profile = getProfileOrDefault(user?.businessType as BusinessType);

  const hasActivity = Boolean(
    data && (data.todaySales > 0 || data.recentActivity.length > 0 || data.outstandingCustomers > 0 || data.outstandingSuppliers > 0)
  );

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <PageHeader
          eyebrow={isVietnamese ? "Tổng quan hôm nay" : "Today at a glance"}
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
                  <span>{t("nav.agent", "AI Agent")}</span>
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setReportModalOpen(true)} className="items-center gap-1.5 font-bold">
                <FileText className="h-4 w-4 text-primary" />
                <span>{isVietnamese ? "Báo cáo" : "Report"}</span>
              </Button>
              {canManageRecords && (
                <>
                  <Button asChild variant="outline">
                    <Link to="/expenses?create=1">
                      <Receipt className="h-4 w-4" />
                      <span>{isVietnamese ? "+ Ghi khoản chi" : "Add expense"}</span>
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/sales?create=1">
                      <Plus className="h-4 w-4" />
                      <span>{isVietnamese ? "+ Bán hàng" : "New sale"}</span>
                    </Link>
                  </Button>
                </>
              )}
            </>
          }
        />

        {!hasActivity && canManageRecords && (
          <GettingStartedGuide
            companyName={user?.companyName || (isVietnamese ? "doanh nghiệp của bạn" : "Your business")}
            currency={currency}
            businessType={user?.businessType}
            hasActivity={false}
          />
        )}

        {query.isLoading ? (
          <LoadingState label={isVietnamese ? "Đang mở tình hình hôm nay…" : "Opening today's business…"} />
        ) : query.isError ? (
          <section role="alert" className="paper-card border-destructive/25 p-6">
            <h2 className="font-bold">{isVietnamese ? "Không thể mở sổ hôm nay." : "We couldn’t open today’s records."}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isVietnamese ? "Dữ liệu của bạn vẫn an toàn. Hãy kiểm tra kết nối và thử lại." : "Your data is safe. Check the connection and try again."}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
              {isVietnamese ? "Thử lại" : "Try again"}
            </Button>
          </section>
        ) : (
          data && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="inline-flex rounded-xl border bg-muted/30 p-1">
                  {(["today", "week", "month", "all"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={cn(
                        "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                        period === p
                          ? "bg-card text-foreground shadow-sm font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p === "today"
                        ? isVietnamese ? "Hôm nay" : "Today"
                        : p === "week"
                        ? isVietnamese ? "Tuần này" : "This Week"
                        : p === "month"
                        ? isVietnamese ? "Tháng này" : "This Month"
                        : isVietnamese ? "Tất cả" : "All Time"}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportModalOpen(true)}
                  className="gap-1.5 text-xs font-bold border-primary/20 hover:bg-primary/5"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>{isVietnamese ? "Tải báo cáo kinh doanh" : "Download report"}</span>
                </Button>
              </div>

              <section aria-label="Period totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MoneyCard
                  featured
                  label={
                    period === "today"
                      ? isVietnamese ? "Doanh thu hôm nay" : "Sales today"
                      : period === "week"
                      ? isVietnamese ? "Doanh thu tuần này" : "Sales this week"
                      : period === "month"
                      ? isVietnamese ? "Doanh thu tháng này" : "Sales this month"
                      : isVietnamese ? "Tổng doanh thu" : "Total sales"
                  }
                  value={businessMoney(data.periodSales ?? data.todaySales, currency)}
                  detail={
                    (data.periodSales ?? data.todaySales) > 0
                      ? `${businessMoney(data.periodPayments ?? data.todayPayments, currency)} ${isVietnamese ? "tiền mặt khách đã trả" : "received from customers"}`
                      : isVietnamese ? "Ghi đơn đầu tiên để bắt đầu theo dõi" : "Record your first sale to start tracking"
                  }
                  icon={ReceiptText}
                  tone="good"
                />
                <MoneyCard
                  label={isVietnamese ? "Lợi nhuận ước tính" : "Net profit"}
                  value={businessMoney(data.periodNetProfit ?? 0, currency)}
                  detail={
                    isVietnamese
                      ? "Doanh thu - (Chi phí + Nhập hàng)"
                      : "Sales - (Expenses + Purchases)"
                  }
                  icon={TrendingUp}
                  tone={(data.periodNetProfit ?? 0) >= 0 ? "good" : "out"}
                />
                <MoneyCard
                  label={isVietnamese ? "Tiền mặt thực thu" : "Money received"}
                  value={businessMoney(data.periodPayments ?? data.todayPayments, currency)}
                  detail={
                    (data.periodPayments ?? data.todayPayments) > 0
                      ? isVietnamese ? "Tổng tiền mặt đã thu trong kỳ" : "Payments collected in period"
                      : isVietnamese ? "Chưa thu khoản tiền nào" : "No payments received yet"
                  }
                  icon={ArrowDownToLine}
                  tone="good"
                />
                <MoneyCard
                  label={isVietnamese ? "Khoản đã chi & nhập hàng" : "Spent & purchases"}
                  value={businessMoney(
                    (data.periodSupplierPayments ?? data.todaySupplierPayments) +
                      (data.periodExpenses ?? data.todayExpenses),
                    currency
                  )}
                  detail={
                    (data.periodSupplierPayments ?? data.todaySupplierPayments) +
                      (data.periodExpenses ?? data.todayExpenses) > 0
                      ? isVietnamese ? "Tiền trả nhà cung cấp & chi tiêu" : "Supplier payments and expenses"
                      : isVietnamese ? "Chưa ghi nhận khoản chi nào" : "No expenses recorded"
                  }
                  icon={WalletCards}
                  tone="out"
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                <div className="paper-card overflow-hidden">
                  <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
                    <div>
                      <h2 className="text-lg font-bold">{isVietnamese ? "Hoạt động gần đây" : "Recent activity"}</h2>
                      <p className="text-sm text-muted-foreground">{isVietnamese ? "Các bản ghi kinh doanh mới nhất" : "Your latest business records"}</p>
                    </div>
                  </div>
                  {data.recentActivity.length === 0 ? (
                    <div className="p-5">
                      <EmptyState
                        compact
                        icon={ShoppingBasket}
                        title={isVietnamese ? "Hôm nay chưa có hoạt động" : "No activity yet today"}
                        description={isVietnamese ? "Ghi đơn bán, lần nhập hàng hoặc khoản chi để xem tại đây." : "Record a sale, purchase, or expense and it will appear here."}
                        action={canManageRecords ? (
                          <Button asChild>
                            <Link to="/sales?create=1">{isVietnamese ? "Ghi đơn bán đầu tiên" : (profile.starterSteps[0]?.actionLabel || "Record first sale")}</Link>
                          </Button>
                        ) : undefined}
                      />
                    </div>
                  ) : (
                    <div className="divide-y">
                      {data.recentActivity.map((activity) => (
                        <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                            {activityIcon(activity.type)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">{activity.title}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {friendlyType(activity.type, isVietnamese)} · {activity.detail}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="tabular-nums font-bold">{businessMoney(activity.amount, currency)}</p>
                            <p className="text-xs text-muted-foreground">{friendlyDate(activity.occurredAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Tailored Quick Actions based on business profile */}
                  <div className="paper-card p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">{isVietnamese ? "Thao tác nhanh" : "Quick actions"}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{isVietnamese ? "Ghi và xem sổ kinh doanh" : profile.tagline}</p>
                      </div>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {isVietnamese ? t(`profile.${profile.type}`) : profile.shortLabel}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {profile.quickActions.map((action) => {
                        const Icon = getActionIcon(action.iconName);
                        return <QuickLink key={action.to + action.label} to={action.to} icon={Icon} label={isVietnamese ? quickActionLabel(action.to) : action.label} />;
                      })}
                    </div>
                  </div>

                  <div className="paper-card bg-[hsl(var(--warning)/.1)] p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-amber-800">
                        <CircleDollarSign size={19} />
                      </span>
                      <div>
                        <p className="text-sm font-bold">{isVietnamese ? "Bạn đang nợ nhà cung cấp" : "You owe suppliers"}</p>
                        <p className="tabular-nums text-xl font-bold">{businessMoney(data.outstandingSuppliers, currency)}</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" className="mt-3 w-full justify-between">
                      <Link to="/suppliers">
                        <span>{isVietnamese ? "Xem số dư nhà cung cấp" : "See supplier balances"}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>

              {data.unpaidCustomers.length > 0 && (
                <section>
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{isVietnamese ? "Khách hàng cần theo dõi" : "Customers to follow up"}</h2>
                      <p className="text-sm text-muted-foreground">{isVietnamese ? "Những người còn số dư chưa trả" : "People with an unpaid balance"}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/customers">{t("common.viewAll")}</Link>
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.unpaidCustomers.slice(0, 6).map((customer) => (
                      <Link
                        key={customer.id}
                        to={`/customers/${customer.id}`}
                        className="paper-card friendly-focus flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary/35 hover:bg-accent/20"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isVietnamese ? `${customer.salesCount} đơn bán` : `${customer.salesCount} sale${customer.salesCount === 1 ? "" : "s"}`}
                          </p>
                        </div>
                        <p className="tabular-nums font-bold text-amber-800 dark:text-amber-300">
                          {businessMoney(customer.outstandingBalance, customer.currency)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        )}
      </div>

      <BusinessReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        defaultPeriod={period === "all" ? "all" : "month"}
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
      className="friendly-focus flex min-h-12 items-center gap-3 rounded-xl border bg-card px-3.5 text-sm font-bold transition-colors hover:border-primary/35 hover:bg-accent/35"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="flex-1">{label}</span>
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

function quickActionLabel(to: string) {
  if (to.startsWith("/sales?")) return "Ghi đơn bán mới";
  if (to === "/sales") return "Xem sổ bán hàng";
  if (to === "/products") return "Quản lý hàng hoá";
  if (to === "/customers") return "Khách hàng & số dư";
  if (to.startsWith("/expenses?")) return "Ghi khoản chi";
  if (to === "/expenses") return "Xem sổ chi tiêu";
  if (to === "/purchases") return "Ghi nhập hàng";
  return "Mở sổ";
}

function activityIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("sale")) return <ReceiptText size={18} />;
  if (normalized.includes("purchase")) return <PackageOpen size={18} />;
  if (normalized.includes("expense")) return <Receipt size={18} />;
  return <WalletCards size={18} />;
}
