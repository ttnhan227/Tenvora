import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ReceiptText,
  TrendingUp,
  WalletCards,
  ArrowDownToLine,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

interface BusinessReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriod?: "month" | "last_month" | "quarter" | "year" | "all";
}

type ReportPeriodKey = "month" | "last_month" | "quarter" | "year" | "all";

export function BusinessReportModal({
  open,
  onOpenChange,
  defaultPeriod = "month",
}: BusinessReportModalProps) {
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodKey>(defaultPeriod);
  const [activeTab, setActiveTab] = useState<"summary" | "sales" | "expenses" | "debts">("summary");

  // Calculate Date Boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    if (selectedPeriod === "month") {
      const from = new Date(Date.UTC(year, month, 1));
      const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      const label = isVietnamese ? `Tháng ${(month + 1).toString().padStart(2, "0")}/${year}` : `${now.toLocaleString("en-US", { month: "long" })} ${year}`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        backendPeriod: "month",
        label,
        rangeLabel,
      };
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
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        backendPeriod: "custom",
        label,
        rangeLabel,
      };
    }

    if (selectedPeriod === "quarter") {
      const q = Math.floor(month / 3);
      const from = new Date(Date.UTC(year, q * 3, 1));
      const to = new Date(Date.UTC(year, (q + 1) * 3, 0, 23, 59, 59));
      const label = isVietnamese ? `Quý ${q + 1}/${year}` : `Q${q + 1} ${year}`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        backendPeriod: "custom",
        label,
        rangeLabel,
      };
    }

    if (selectedPeriod === "year") {
      const from = new Date(Date.UTC(year, 0, 1));
      const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      const label = isVietnamese ? `Năm ${year}` : `Year ${year}`;
      const rangeLabel = `${from.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")} – ${to.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}`;
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        backendPeriod: "year",
        label,
        rangeLabel,
      };
    }

    // All time
    return {
      from: undefined,
      to: undefined,
      backendPeriod: "all",
      label: isVietnamese ? "Toàn thời gian (Tổng thể)" : "All Time (Overall)",
      rangeLabel: isVietnamese ? "Toàn bộ lịch sử kinh doanh" : "Full business history",
    };
  }, [selectedPeriod, isVietnamese]);

  // Queries
  const dashboardQuery = useQuery({
    queryKey: ["business-report-dashboard", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getDashboard(dateRange.backendPeriod, dateRange.from, dateRange.to),
    enabled: open,
  });

  const salesQuery = useQuery({
    queryKey: ["business-report-sales", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getSales("", undefined, dateRange.from, dateRange.to),
    enabled: open,
  });

  const expensesQuery = useQuery({
    queryKey: ["business-report-expenses", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getBusinessExpenses("", "", dateRange.from, dateRange.to),
    enabled: open,
  });

  const purchasesQuery = useQuery({
    queryKey: ["business-report-purchases", selectedPeriod, dateRange.from, dateRange.to],
    queryFn: () => businessService.getPurchases("", undefined, dateRange.from, dateRange.to),
    enabled: open,
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

  // Aggregated totals
  const totalSales = dash?.periodSales ?? salesList.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCollected = dash?.periodPayments ?? salesList.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalExpenses = dash?.periodExpenses ?? expensesList.reduce((acc, e) => acc + e.amount, 0);
  const totalPurchases = dash?.periodPurchases ?? purchasesList.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalSupplierPaid = dash?.periodSupplierPayments ?? purchasesList.reduce((acc, p) => acc + p.paidAmount, 0);
  const netProfit = dash?.periodNetProfit ?? (totalSales - (totalExpenses + totalPurchases));
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
      toast.success(isVietnamese ? "Đang chuẩn bị bản in báo cáo..." : "Preparing report printout...");
    } catch {
      toast.error(isVietnamese ? "Không thể mở trang in" : "Could not open print dialogue");
    }
  };

  const handleDownloadHtml = () => {
    try {
      downloadHtmlReport(reportPayload);
      toast.success(isVietnamese ? "Đã tải báo cáo kinh doanh HTML!" : "Downloaded HTML business statement!");
    } catch {
      toast.error(isVietnamese ? "Không thể tải báo cáo" : "Could not download report");
    }
  };

  const handleExportCsv = () => {
    try {
      exportReportCsv(reportPayload);
      toast.success(isVietnamese ? "Đã xuất bảng kê CSV!" : "Exported CSV statement!");
    } catch {
      toast.error(isVietnamese ? "Không thể xuất file CSV" : "Could not export CSV");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold font-serif">
                  {isVietnamese ? "Báo cáo tổng kết kinh doanh" : "Business Performance Report"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {user?.companyName || "Tenvora Store"} &bull; {dateRange.label}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Period Picker */}
            <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 self-start sm:self-auto">
              {(
                [
                  { key: "month", vi: "Tháng này", en: "This Month" },
                  { key: "last_month", vi: "Tháng trước", en: "Last Month" },
                  { key: "quarter", vi: "Quý này", en: "This Quarter" },
                  { key: "year", vi: "Năm nay", en: "This Year" },
                  { key: "all", vi: "Toàn bộ", en: "All Time" },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPeriod(p.key)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                    selectedPeriod === p.key
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isVietnamese ? p.vi : p.en}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                activeTab === "summary"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {isVietnamese ? "Tổng quan P&L" : "Executive Summary"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                activeTab === "sales"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {isVietnamese ? `Sổ bán hàng (${salesList.length})` : `Sales (${salesList.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expenses")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                activeTab === "expenses"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {isVietnamese
                ? `Chi phí & Nhập (${expensesList.length + purchasesList.length})`
                : `Outflow (${expensesList.length + purchasesList.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("debts")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                activeTab === "debts"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {isVietnamese ? "Sổ nợ & Phải trả" : "Debts & Payables"}
            </button>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {isVietnamese ? "Đang tổng hợp số liệu báo cáo..." : "Compiling statement data..."}
              </p>
            </div>
          ) : (
            <>
              {/* Top 4 KPI Metrics */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="paper-card p-4 bg-card">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isVietnamese ? "Doanh thu bán" : "Gross Sales"}
                    </span>
                    <ReceiptText className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold font-serif mt-2 tabular-nums">{money(totalSales)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {salesList.length} {isVietnamese ? "đơn hoàn thành" : "sales completed"}
                  </p>
                </div>

                <div className="paper-card p-4 bg-card">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isVietnamese ? "Thực thu tiền mặt" : "Cash Inflow"}
                    </span>
                    <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold font-serif mt-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                    {money(totalCollected)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isVietnamese ? "Đã thu từ khách" : "Collected from clients"}
                  </p>
                </div>

                <div className="paper-card p-4 bg-card">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isVietnamese ? "Chi tiêu & Nhập" : "Spend & Purchases"}
                    </span>
                    <WalletCards className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold font-serif mt-2 tabular-nums">
                    {money(totalExpenses + totalPurchases)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {money(totalExpenses)} chi + {money(totalPurchases)} nhập
                  </p>
                </div>

                <div
                  className={cn(
                    "paper-card p-4 border",
                    netProfit >= 0
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-destructive/10 border-destructive/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isVietnamese ? "Lợi nhuận kinh doanh" : "Net Profit"}
                    </span>
                    <TrendingUp className={cn("h-4 w-4", netProfit >= 0 ? "text-emerald-600" : "text-destructive")} />
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold font-serif mt-2 tabular-nums",
                      netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
                    )}
                  >
                    {money(netProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isVietnamese ? "Doanh thu - (Chi phí + Nhập)" : "Sales - (Expenses + Purchases)"}
                  </p>
                </div>
              </div>

              {/* Tab 1: Summary */}
              {activeTab === "summary" && (
                <div className="space-y-4">
                  <div className="paper-card p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                      {isVietnamese ? "Bảng cân đối dòng tiền & Lợi nhuận" : "Cash & Profit Summary"}
                    </h3>
                    <div className="divide-y text-sm">
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground">
                          {isVietnamese ? "(+) Tổng doanh thu bán hàng" : "(+) Total Sales Revenue"}
                        </span>
                        <span className="font-bold tabular-nums">{money(totalSales)}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground">
                          {isVietnamese ? "    &bull; Tiền mặt thực thu từ khách" : "    &bull; Cash collected"}
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {money(totalCollected)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground">
                          {isVietnamese ? "    &bull; Khách hàng còn nợ trong kỳ" : "    &bull; Outstanding client debt"}
                        </span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                          {money(outstandingCustomers)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground">
                          {isVietnamese ? "(-) Chi phí hoạt động cửa hàng" : "(-) Operating Expenses"}
                        </span>
                        <span className="font-semibold text-destructive tabular-nums">{money(totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground">
                          {isVietnamese ? "(-) Giá trị nhập hàng từ nhà cung cấp" : "(-) Inventory Purchases"}
                        </span>
                        <span className="font-semibold text-destructive tabular-nums">{money(totalPurchases)}</span>
                      </div>
                      <div className="flex justify-between py-3 font-bold text-base bg-muted/20 px-2 rounded-lg">
                        <span>{isVietnamese ? "(=) LỢI NHUẬN THUẦN DỰ TÍNH" : "(=) ESTIMATED NET PROFIT"}</span>
                        <span
                          className={cn(
                            "tabular-nums font-serif text-lg",
                            netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                          )}
                        >
                          {money(netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Receivables & Payables highlight */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="paper-card p-4 border-amber-500/20 bg-amber-500/5">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                        {isVietnamese ? "Công nợ khách hàng cần thu" : "Accounts Receivable"}
                      </p>
                      <p className="text-xl font-bold font-serif text-amber-800 dark:text-amber-200 mt-1 tabular-nums">
                        {money(outstandingCustomers)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dash?.unpaidCustomers?.length || 0} {isVietnamese ? "khách hàng chưa trả hết" : "customers with balances"}
                      </p>
                    </div>

                    <div className="paper-card p-4 border-border bg-muted/20">
                      <p className="text-xs font-bold text-foreground/80 uppercase">
                        {isVietnamese ? "Công nợ nhà cung cấp phải trả" : "Accounts Payable"}
                      </p>
                      <p className="text-xl font-bold font-serif mt-1 tabular-nums">
                        {money(outstandingSuppliers)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dash?.unpaidSuppliers?.length || 0} {isVietnamese ? "nhà cung cấp cần thanh toán" : "suppliers to pay"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Sales Ledger */}
              {activeTab === "sales" && (
                <div className="paper-card overflow-hidden">
                  <div className="border-b p-4 bg-muted/20 flex justify-between items-center">
                    <h3 className="font-bold text-sm">
                      {isVietnamese ? "Chi tiết các đơn bán hàng trong kỳ" : "Sales Transactions"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {salesList.length} {isVietnamese ? "đơn" : "records"}
                    </span>
                  </div>
                  {salesList.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      {isVietnamese ? "Không có đơn bán nào trong kỳ được chọn." : "No sales in this period."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 text-muted-foreground font-bold border-b">
                          <tr>
                            <th className="py-2.5 px-3">{isVietnamese ? "Mã đơn" : "Sale #"}</th>
                            <th className="py-2.5 px-3">{isVietnamese ? "Ngày" : "Date"}</th>
                            <th className="py-2.5 px-3">{isVietnamese ? "Khách hàng" : "Customer"}</th>
                            <th className="py-2.5 px-3 text-right">{isVietnamese ? "Tổng tiền" : "Total"}</th>
                            <th className="py-2.5 px-3 text-right">{isVietnamese ? "Đã thu" : "Paid"}</th>
                            <th className="py-2.5 px-3 text-right">{isVietnamese ? "Còn nợ" : "Balance"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {salesList.slice(0, 30).map((s) => (
                            <tr key={s.id} className="hover:bg-muted/30">
                              <td className="py-2 px-3 font-bold">{s.saleNumber}</td>
                              <td className="py-2 px-3 text-muted-foreground">{s.soldAt.slice(0, 10)}</td>
                              <td className="py-2 px-3 font-medium">{s.customerName}</td>
                              <td className="py-2 px-3 text-right font-bold tabular-nums">{money(s.totalAmount)}</td>
                              <td className="py-2 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                                {money(s.paidAmount)}
                              </td>
                              <td
                                className={cn(
                                  "py-2 px-3 text-right tabular-nums font-bold",
                                  s.outstandingBalance > 0 && "text-amber-700 dark:text-amber-400"
                                )}
                              >
                                {money(s.outstandingBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {salesList.length > 30 && (
                        <div className="p-2 text-center text-xs text-muted-foreground bg-muted/10 border-t">
                          {isVietnamese
                            ? `Hiển thị 30 / ${salesList.length} đơn. Tải báo cáo đầy đủ để xem tất cả.`
                            : `Showing 30 of ${salesList.length} sales. Download report for all rows.`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Expenses & Purchases */}
              {activeTab === "expenses" && (
                <div className="space-y-4">
                  {/* Operating expenses */}
                  <div className="paper-card overflow-hidden">
                    <div className="border-b p-4 bg-muted/20 flex justify-between items-center">
                      <h3 className="font-bold text-sm">
                        {isVietnamese ? "Chi phí vận hành" : "Operating Expenses"}
                      </h3>
                      <span className="text-xs font-bold tabular-nums text-destructive">
                        {money(totalExpenses)}
                      </span>
                    </div>
                    {expensesList.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        {isVietnamese ? "Không có chi phí nào trong kỳ này." : "No expenses recorded in this period."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/40 text-muted-foreground font-bold border-b">
                            <tr>
                              <th className="py-2.5 px-3">{isVietnamese ? "Ngày" : "Date"}</th>
                              <th className="py-2.5 px-3">{isVietnamese ? "Danh mục" : "Category"}</th>
                              <th className="py-2.5 px-3">{isVietnamese ? "Diễn giải" : "Description"}</th>
                              <th className="py-2.5 px-3 text-right">{isVietnamese ? "Số tiền" : "Amount"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {expensesList.slice(0, 20).map((e) => (
                              <tr key={e.id} className="hover:bg-muted/30">
                                <td className="py-2 px-3 text-muted-foreground">{e.expenseDate.slice(0, 10)}</td>
                                <td className="py-2 px-3 font-semibold">{e.category}</td>
                                <td className="py-2 px-3 text-muted-foreground">{e.description || "-"}</td>
                                <td className="py-2 px-3 text-right font-bold tabular-nums text-destructive">
                                  {money(e.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Inventory purchases */}
                  <div className="paper-card overflow-hidden">
                    <div className="border-b p-4 bg-muted/20 flex justify-between items-center">
                      <h3 className="font-bold text-sm">
                        {isVietnamese ? "Nhập hàng từ nhà cung cấp" : "Inventory Purchases"}
                      </h3>
                      <span className="text-xs font-bold tabular-nums text-foreground">
                        {money(totalPurchases)}
                      </span>
                    </div>
                    {purchasesList.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        {isVietnamese ? "Không có phiếu nhập hàng nào trong kỳ này." : "No purchases in this period."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/40 text-muted-foreground font-bold border-b">
                            <tr>
                              <th className="py-2.5 px-3">{isVietnamese ? "Mã phiếu" : "Bill #"}</th>
                              <th className="py-2.5 px-3">{isVietnamese ? "Ngày" : "Date"}</th>
                              <th className="py-2.5 px-3">{isVietnamese ? "Nhà cung cấp" : "Supplier"}</th>
                              <th className="py-2.5 px-3 text-right">{isVietnamese ? "Tổng tiền" : "Total"}</th>
                              <th className="py-2.5 px-3 text-right">{isVietnamese ? "Đã trả" : "Paid"}</th>
                              <th className="py-2.5 px-3 text-right">{isVietnamese ? "Còn nợ" : "Balance"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {purchasesList.slice(0, 20).map((p) => (
                              <tr key={p.id} className="hover:bg-muted/30">
                                <td className="py-2 px-3 font-bold">{p.purchaseNumber}</td>
                                <td className="py-2 px-3 text-muted-foreground">{p.purchasedAt.slice(0, 10)}</td>
                                <td className="py-2 px-3 font-medium">{p.supplierName}</td>
                                <td className="py-2 px-3 text-right font-bold tabular-nums">{money(p.totalAmount)}</td>
                                <td className="py-2 px-3 text-right tabular-nums">{money(p.paidAmount)}</td>
                                <td className="py-2 px-3 text-right font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                  {money(p.outstandingBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Debts */}
              {activeTab === "debts" && (
                <div className="space-y-4">
                  <div className="paper-card overflow-hidden">
                    <div className="border-b p-4 bg-amber-500/10 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                        {isVietnamese ? "Khách hàng còn nợ tiền" : "Customer Balances"}
                      </h3>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 tabular-nums">
                        {money(outstandingCustomers)}
                      </span>
                    </div>
                    {dash?.unpaidCustomers?.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        {isVietnamese ? "Tuyệt vời! Không có khách hàng nào đang nợ." : "No outstanding customer debt."}
                      </div>
                    ) : (
                      <div className="divide-y text-xs">
                        {dash?.unpaidCustomers?.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                            <div>
                              <p className="font-bold">{c.name}</p>
                              <p className="text-muted-foreground text-[11px]">{c.phone || c.email || "-"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                                {money(c.outstandingBalance)}
                              </p>
                              <p className="text-muted-foreground text-[11px]">
                                {c.salesCount} {isVietnamese ? "đơn mua" : "orders"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="paper-card overflow-hidden">
                    <div className="border-b p-4 bg-muted/30 flex justify-between items-center">
                      <h3 className="font-bold text-sm">
                        {isVietnamese ? "Nợ phải trả nhà cung cấp" : "Supplier Payables"}
                      </h3>
                      <span className="text-xs font-bold tabular-nums">{money(outstandingSuppliers)}</span>
                    </div>
                    {dash?.unpaidSuppliers?.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        {isVietnamese ? "Không có khoản nợ nhà cung cấp nào." : "No supplier debts."}
                      </div>
                    ) : (
                      <div className="divide-y text-xs">
                        {dash?.unpaidSuppliers?.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-3.5 hover:bg-muted/20">
                            <div>
                              <p className="font-bold">{s.name}</p>
                              <p className="text-muted-foreground text-[11px]">{s.phone || "-"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                {money(s.outstandingBalance)}
                              </p>
                              <p className="text-muted-foreground text-[11px]">
                                {s.purchaseCount} {isVietnamese ? "lần nhập" : "bills"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <DialogFooter className="p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {isVietnamese ? "Định dạng in chuẩn A4, lưu trữ hoặc gửi kế toán" : "Standard A4 layout, ready for accounting"}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{isVietnamese ? "Xuất CSV" : "Export CSV"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHtml}
              disabled={isLoading}
              className="gap-1.5 font-semibold"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>{isVietnamese ? "Tải báo cáo HTML" : "Download HTML"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isLoading}
              className="gap-1.5 font-bold shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>{isVietnamese ? "In / Lưu PDF" : "Print / Save PDF"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
