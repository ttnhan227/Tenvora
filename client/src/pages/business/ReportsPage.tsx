import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { businessMoney, businessService } from "@/services/businessService";
import {
  BusinessReportData,
  downloadHtmlReport,
  exportReportCsv,
  printReport,
} from "@/lib/reportGenerator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReportPeriodKey = "month" | "last_month" | "quarter" | "year" | "all";

export default function ReportsPage() {
  const { user } = useAuth();
  const { isVietnamese, t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodKey>("month");

  // Calculate Date Boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (selectedPeriod === "month") {
      const from = new Date(Date.UTC(year, month, 1));
      const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      const label = isVietnamese ? `Tháng ${(month + 1).toString().padStart(2, "0")}/${year}` : `${now.toLocaleString("en-US", { month: "long" })} ${year}`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return { from: from.toISOString(), to: to.toISOString(), backendPeriod: "month", label, rangeLabel };
    }

    if (selectedPeriod === "last_month") {
      const lastMonthYear = month === 0 ? year - 1 : year;
      const lastMonth = month === 0 ? 11 : month - 1;
      const from = new Date(Date.UTC(lastMonthYear, lastMonth, 1));
      const to = new Date(Date.UTC(lastMonthYear, lastMonth + 1, 0, 23, 59, 59));
      const label = isVietnamese
        ? `Tháng ${(lastMonth + 1).toString().padStart(2, "0")}/${lastMonthYear} (Tháng trước)`
        : `${new Date(lastMonthYear, lastMonth, 1).toLocaleString("en-US", { month: "long" })} ${lastMonthYear} (Last month)`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return { from: from.toISOString(), to: to.toISOString(), backendPeriod: "custom", label, rangeLabel };
    }

    if (selectedPeriod === "quarter") {
      const q = Math.floor(month / 3);
      const from = new Date(Date.UTC(year, q * 3, 1));
      const to = new Date(Date.UTC(year, (q + 1) * 3, 0, 23, 59, 59));
      const label = isVietnamese ? `Quý ${q + 1}/${year}` : `Q${q + 1} ${year}`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return { from: from.toISOString(), to: to.toISOString(), backendPeriod: "custom", label, rangeLabel };
    }

    if (selectedPeriod === "year") {
      const from = new Date(Date.UTC(year, 0, 1));
      const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      const label = isVietnamese ? `Năm ${year}` : `Year ${year}`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return { from: from.toISOString(), to: to.toISOString(), backendPeriod: "year", label, rangeLabel };
    }

    return {
      from: undefined,
      to: undefined,
      backendPeriod: "all",
      label: isVietnamese ? "Toàn bộ lịch sử (Tổng thể)" : "All Time (Overall)",
      rangeLabel: isVietnamese ? "Tất cả các giao dịch từ trước đến nay" : "Full business history",
    };
  }, [selectedPeriod, isVietnamese]);

  // Data queries
  const dashboardQuery = useQuery({
    queryKey: ["reports-dashboard", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getDashboard(dateRange.backendPeriod, dateRange.from, dateRange.to),
  });

  const salesQuery = useQuery({
    queryKey: ["reports-sales", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getSales("", undefined, dateRange.from, dateRange.to),
  });

  const expensesQuery = useQuery({
    queryKey: ["reports-expenses", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getBusinessExpenses("", "", dateRange.from, dateRange.to),
  });

  const purchasesQuery = useQuery({
    queryKey: ["reports-purchases", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getPurchases("", undefined, dateRange.from, dateRange.to),
  });

  const isLoading =
    dashboardQuery.isLoading ||
    salesQuery.isLoading ||
    expensesQuery.isLoading ||
    purchasesQuery.isLoading;

  const dash = dashboardQuery.data;
  const currency = dash?.currency ?? user?.preferredCurrency ?? "USD";
  const money = (val: number) => businessMoney(val, currency);

  const salesList = salesQuery.data || [];
  const expensesList = expensesQuery.data || [];
  const purchasesList = purchasesQuery.data || [];

  const totalSales = dash?.periodSales ?? salesList.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCollected = dash?.periodPayments ?? salesList.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalExpenses = dash?.periodExpenses ?? expensesList.reduce((acc, e) => acc + e.amount, 0);
  const totalPurchases = dash?.periodPurchases ?? purchasesList.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalSupplierPaid = dash?.periodSupplierPayments ?? purchasesList.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalCogs = dash?.periodCogs ?? salesList.flatMap(s => s.items).reduce((acc, i) => acc + (i.unitCost != null ? (i.quantity * i.unitCost) : 0), 0);
  const netProfit = dash?.periodNetProfit ?? (totalSales - totalCogs - totalExpenses);
  const outstandingCustomers = dash?.outstandingCustomers ?? salesList.reduce((acc, s) => acc + s.outstandingBalance, 0);
  const outstandingSuppliers = dash?.outstandingSuppliers ?? purchasesList.reduce((acc, p) => acc + p.outstandingBalance, 0);

  const reportPayload: BusinessReportData = {
    companyName: user?.companyName || (isVietnamese ? "Cửa hàng của bạn" : "Your Store"),
    ownerName: user?.fullName || user?.email?.split("@")[0],
    businessType: user?.businessType,
    currency,
    period: selectedPeriod,
    periodLabel: dateRange.label,
    dateRangeLabel: dateRange.rangeLabel,
    isVietnamese,
    totalSales,
    salesCount: salesList.length,
    totalCollected,
    totalPurchases,
    purchasesCount: purchasesList.length,
    totalSupplierPaid,
    totalExpenses,
    expensesCount: expensesList.length,
    totalCogs,
    netProfit,
    outstandingCustomers,
    outstandingSuppliers,
    sales: salesList,
    expenses: expensesList,
    purchases: purchasesList,
    unpaidCustomers: dash?.unpaidCustomers || [],
    unpaidSuppliers: dash?.unpaidSuppliers || [],
    recentActivity: dash?.recentActivity || [],
  };

  const handlePrint = () => {
    try {
      printReport(reportPayload);
      toast.success(isVietnamese ? "Đang mở cửa sổ in chuẩn A4..." : "Opening A4 print layout...");
    } catch {
      toast.error(isVietnamese ? "Không thể mở trang in" : "Could not open print dialogue");
    }
  };

  const handleDownloadHtml = () => {
    try {
      downloadHtmlReport(reportPayload);
      toast.success(isVietnamese ? "Đã tải báo cáo định dạng HTML!" : "Downloaded HTML business report!");
    } catch {
      toast.error(isVietnamese ? "Không thể tải báo cáo" : "Could not download report");
    }
  };

  const handleExportCsv = () => {
    try {
      exportReportCsv(reportPayload);
      toast.success(isVietnamese ? "Đã xuất bảng kê chi tiết CSV!" : "Exported CSV statement!");
    } catch {
      toast.error(isVietnamese ? "Không thể xuất CSV" : "Could not export CSV");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border bg-card shadow-sm">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border-38 border-primary/5" />
          <div className="relative grid gap-7 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <FileText className="h-4 w-4" />
                <span>{isVietnamese ? "Báo cáo quản trị" : "Management report"}</span>
              </div>
              <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                {isVietnamese ? "Báo cáo kinh doanh" : "Business Statement"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <strong className="text-foreground">{user?.companyName || "Tenvora Store"}</strong>
                <span>{dateRange.label}</span>
                <span>{dateRange.rangeLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={isLoading}
                className="gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>{isVietnamese ? "Xuất CSV" : "Export CSV"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadHtml}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Download className="h-4 w-4 text-primary" />
                <span>{isVietnamese ? "Tải báo cáo HTML" : "Download HTML"}</span>
              </Button>
              <Button
                onClick={handlePrint}
                disabled={isLoading}
                className="gap-1.5 font-bold"
              >
                <Printer className="h-4 w-4" />
                <span>{isVietnamese ? "In / Lưu PDF" : "Print / Save PDF"}</span>
              </Button>
            </div>
          </div>
          <div className="relative flex flex-col gap-3 border-t bg-muted/20 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{isVietnamese ? "Chọn kỳ báo cáo" : "Select reporting period"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "month", vi: "Tháng này", en: "This Month" },
                  { key: "last_month", vi: "Tháng trước", en: "Last Month" },
                  { key: "quarter", vi: "Quý này", en: "This Quarter" },
                  { key: "year", vi: "Năm nay", en: "This Year" },
                  { key: "all", vi: "Tất cả", en: "All Time" },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPeriod(p.key)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
                    selectedPeriod === p.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {isVietnamese ? p.vi : p.en}
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLoading ? (
          <LoadingState label={isVietnamese ? "Đang chuẩn bị báo cáo..." : "Compiling financial statements..."} />
        ) : (
          <div className="space-y-6">
            <section aria-label="Executive Totals" className="grid overflow-hidden rounded-2xl border bg-card sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
              <ReportMetric
                index="01"
                label={isVietnamese ? "Tổng doanh thu bán hàng" : "Gross Revenue"}
                value={money(totalSales)}
                detail={
                  salesList.length > 0
                    ? `${salesList.length} ${isVietnamese ? "đơn hàng ghi nhận" : "sales completed"}`
                    : isVietnamese ? "Chưa có đơn bán trong kỳ" : "No sales in this period"
                }
                tone="good"
              />
              <ReportMetric
                index="02"
                label={isVietnamese ? "Lợi nhuận kinh doanh" : "Net Profit"}
                value={money(netProfit)}
                detail={
                  isVietnamese
                    ? "Doanh thu - Giá vốn - Chi phí"
                    : "Sales - COGS - Expenses"
                }
                tone={netProfit >= 0 ? "good" : "out"}
              />
              <ReportMetric
                index="03"
                label={isVietnamese ? "Tiền mặt thực thu" : "Cash Inflow"}
                value={money(totalCollected)}
                detail={
                  totalCollected > 0
                    ? isVietnamese ? "Thực nhận từ khách hàng" : "Collected from customers"
                    : isVietnamese ? "Chưa thu tiền" : "No payments received"
                }
                tone="good"
              />
              <ReportMetric
                index="04"
                label={isVietnamese ? "Tổng chi tiêu & nhập hàng" : "Spend & Purchases"}
                value={money(totalExpenses + totalPurchases)}
                detail={`${money(totalExpenses)} chi + ${money(totalPurchases)} nhập`}
                tone="out"
              />
            </section>

            {/* P&L Statement Card */}
            <div className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-8">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold font-serif">
                    {isVietnamese ? "Bảng kê kết quả kinh doanh" : "Profit & Loss Statement"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateRange.label} &bull; {dateRange.rangeLabel}
                  </p>
                </div>
                <span className="notebook-label">
                  {user?.companyName || "Tenvora Store"}
                </span>
              </div>

              <div className="divide-y text-sm">
                <div className="flex justify-between py-3">
                  <span className="font-semibold text-foreground">
                    {isVietnamese ? "1. Doanh thu bán hàng (Gross Sales)" : "1. Gross Sales Revenue"}
                  </span>
                  <span className="font-bold tabular-nums text-foreground">{money(totalSales)}</span>
                </div>
                <div className="flex justify-between py-2 text-xs text-muted-foreground pl-4">
                  <span>{isVietnamese ? "Tiền mặt đã thực thu từ khách" : "Cash actually collected"}</span>
                  <span className="tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">{money(totalCollected)}</span>
                </div>
                <div className="flex justify-between py-2 text-xs text-muted-foreground pl-4">
                  <span>{isVietnamese ? "Khách còn nợ (Khoản phải thu)" : "Accounts receivable (Customer debt)"}</span>
                  <span className="tabular-nums text-amber-700 dark:text-amber-400 font-medium">{money(outstandingCustomers)}</span>
                </div>

                <div className="flex justify-between py-3">
                  <span className="font-semibold text-destructive">
                    {isVietnamese ? "2. Giá vốn hàng bán (Cost of Goods Sold - COGS)" : "2. Cost of Goods Sold (COGS)"}
                  </span>
                  <span className="font-bold tabular-nums text-destructive">-{money(totalCogs)}</span>
                </div>
                <div className="flex justify-between py-2 text-xs text-muted-foreground pl-4">
                  <span>{isVietnamese ? "Lợi nhuận gộp (Doanh thu - Giá vốn)" : "Gross Profit (Revenue - COGS)"}</span>
                  <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{money(totalSales - totalCogs)}</span>
                </div>

                <div className="flex justify-between py-3">
                  <span className="font-semibold text-destructive">
                    {isVietnamese ? "3. Chi phí vận hành cửa hàng (Operating Expenses)" : "3. Operating Expenses"}
                  </span>
                  <span className="font-bold tabular-nums text-destructive">-{money(totalExpenses)}</span>
                </div>

                <div className="flex justify-between py-4 text-base font-bold bg-muted/20 px-3 rounded-xl mt-2">
                  <span className="font-serif">
                    {isVietnamese ? "LỢI NHUẬN THUẦN KINH DOANH" : "NET OPERATING PROFIT"}
                  </span>
                  <span
                    className={cn(
                      "font-serif text-xl tabular-nums",
                      netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    )}
                  >
                    {money(netProfit)}
                  </span>
                </div>

                <div className="pt-4 mt-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {isVietnamese ? "Dòng tiền nhập hàng từ nhà cung cấp" : "Supplier Purchases & Cash Outflow"}
                  </div>
                  <div className="flex justify-between py-2 text-xs">
                    <span>{isVietnamese ? "Tổng tiền nhập hàng trong kỳ" : "Total purchases in period"}</span>
                    <span className="tabular-nums font-medium">{money(totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs pl-4 text-muted-foreground">
                    <span>{isVietnamese ? "Đã thanh toán cho nhà cung cấp" : "Paid to suppliers"}</span>
                    <span className="tabular-nums font-medium">{money(totalSupplierPaid)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs pl-4 text-muted-foreground">
                    <span>{isVietnamese ? "Còn nợ nhà cung cấp (Khoản phải trả)" : "Accounts payable (Supplier debt)"}</span>
                    <span className="tabular-nums text-amber-700 dark:text-amber-400 font-medium">{money(outstandingSuppliers)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Receivables / Payables Overview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="paper-card p-5 bg-[hsl(var(--warning)/.08)] border-[hsl(var(--warning)/.25)]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    {isVietnamese ? "Khoản phải thu từ khách" : "Accounts Receivable"}
                  </h3>
                  <span className="font-serif font-bold text-lg text-amber-900 dark:text-amber-200 tabular-nums">
                    {money(outstandingCustomers)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {dash?.unpaidCustomers?.length || 0} {isVietnamese ? "khách hàng chưa trả hết số dư trong sổ nợ." : "customers currently owe money."}
                </p>
              </div>

              <div className="paper-card p-5 bg-muted/30 border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-wider">
                    {isVietnamese ? "Khoản phải trả nhà cung cấp" : "Accounts Payable"}
                  </h3>
                  <span className="font-serif font-bold text-lg tabular-nums">
                    {money(outstandingSuppliers)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {dash?.unpaidSuppliers?.length || 0} {isVietnamese ? "nhà cung cấp cần thanh toán tiền hàng." : "suppliers with pending balances."}
                </p>
              </div>
            </div>

            {/* Sales Table Preview */}
            <div className="paper-card overflow-hidden">
              <div className="border-b p-5 flex items-center justify-between bg-card">
                <div>
                  <h3 className="font-bold font-serif text-base">
                    {isVietnamese ? "Danh sách đơn bán hàng" : "Sales Ledger"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {salesList.length} {isVietnamese ? "đơn hàng trong kỳ" : "sales in selected period"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadHtml} className="gap-1.5">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>{isVietnamese ? "Tải toàn bộ" : "Download all"}</span>
                </Button>
              </div>
              {salesList.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {isVietnamese ? "Không có đơn bán nào trong kỳ này." : "No sales in this period."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-bold border-b">
                      <tr>
                        <th className="py-2.5 px-4">{isVietnamese ? "Mã đơn" : "Invoice #"}</th>
                        <th className="py-2.5 px-4">{isVietnamese ? "Ngày bán" : "Date"}</th>
                        <th className="py-2.5 px-4">{isVietnamese ? "Khách hàng" : "Customer"}</th>
                        <th className="py-2.5 px-4 text-right">{isVietnamese ? "Tổng tiền" : "Total"}</th>
                        <th className="py-2.5 px-4 text-right">{isVietnamese ? "Đã thu" : "Paid"}</th>
                        <th className="py-2.5 px-4 text-right">{isVietnamese ? "Còn nợ" : "Balance"}</th>
                        <th className="py-2.5 px-4 text-center">{isVietnamese ? "Trạng thái" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {salesList.slice(0, 15).map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-bold">{s.saleNumber}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{s.soldAt.slice(0, 10)}</td>
                          <td className="py-2.5 px-4 font-semibold">{s.customerName}</td>
                          <td className="py-2.5 px-4 text-right font-bold tabular-nums">{money(s.totalAmount)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                            {money(s.paidAmount)}
                          </td>
                          <td
                            className={cn(
                              "py-2.5 px-4 text-right tabular-nums font-bold",
                              s.outstandingBalance > 0 && "text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {money(s.outstandingBalance)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold",
                                s.paymentStatus === "Paid"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : s.paymentStatus === "Partially paid"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {isVietnamese
                                ? s.paymentStatus === "Paid"
                                  ? "Đã thu"
                                  : s.paymentStatus === "Partially paid"
                                  ? "Thu một phần"
                                  : "Chưa thu"
                                : s.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {salesList.length > 15 && (
                    <div className="p-3 text-center text-xs text-muted-foreground bg-muted/10 border-t">
                      {isVietnamese
                        ? `Hiển thị 15 / ${salesList.length} đơn. Bấm "In / Lưu PDF" hoặc "Tải báo cáo HTML" để xem và lưu toàn bộ bản ghi.`
                        : `Showing 15 of ${salesList.length} sales. Print or download HTML to view complete records.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReportMetric({
  index,
  label,
  value,
  detail,
  tone,
}: {
  index: string;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "out";
}) {
  return (
    <article className="relative border-b p-5 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:odd:border-r-0">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground">{index}</span>
        <span className={cn("h-2 w-2 rounded-full", tone === "good" ? "bg-emerald-500" : "bg-rose-500")} />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", tone === "good" ? "text-foreground" : "text-rose-700 dark:text-rose-300")}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </article>
  );
}
