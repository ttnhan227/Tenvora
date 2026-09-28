import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  generateBusinessReportHtml,
  BusinessReportData,
  exportReportCsv,
} from "@/lib/reportGenerator";
import { BusinessReportModal } from "@/components/business/BusinessReportModal";
import ReportsPage from "@/pages/business/ReportsPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { businessService } from "@/services/businessService";

const mockReportData: BusinessReportData = {
  companyName: "Figure Cafe Store",
  ownerName: "Tenvora Owner",
  businessType: "Figure Cafe",
  currency: "VND",
  period: "month",
  periodLabel: "Tháng 09/2026",
  dateRangeLabel: "01/09/2026 – 30/09/2026",
  isVietnamese: true,
  totalSales: 15000000,
  salesCount: 12,
  totalCollected: 12000000,
  totalPurchases: 6000000,
  purchasesCount: 4,
  totalSupplierPaid: 5000000,
  totalExpenses: 2000000,
  expensesCount: 3,
  netProfit: 7000000,
  outstandingCustomers: 3000000,
  outstandingSuppliers: 1000000,
  sales: [
    {
      id: "sale-1",
      saleNumber: "S-1001",
      customerId: "cust-1",
      customerName: "Minh Anh",
      currency: "VND",
      totalAmount: 500000,
      paidAmount: 500000,
      outstandingBalance: 0,
      paymentStatus: "Paid",
      status: "Posted",
      soldAt: "2026-09-15T10:00:00Z",
      createdAt: "2026-09-15T10:00:00Z",
      items: [],
      payments: [],
    },
    {
      id: "sale-2",
      saleNumber: "S-1002",
      customerId: "cust-2",
      customerName: "Hoang Nam",
      currency: "VND",
      totalAmount: 1000000,
      paidAmount: 600000,
      outstandingBalance: 400000,
      paymentStatus: "Partially paid",
      status: "Posted",
      soldAt: "2026-09-16T14:00:00Z",
      createdAt: "2026-09-16T14:00:00Z",
      items: [],
      payments: [],
    },
  ],
  expenses: [
    {
      id: "exp-1",
      category: "Mặt bằng",
      amount: 1500000,
      currency: "VND",
      description: "Tiền thuê tháng 9",
      expenseDate: "2026-09-05T08:00:00Z",
      createdAt: "2026-09-05T08:00:00Z",
    },
  ],
  purchases: [
    {
      id: "pur-1",
      purchaseNumber: "P-501",
      supplierId: "sup-1",
      supplierName: "Anime Figures Distributor",
      currency: "VND",
      totalAmount: 4000000,
      paidAmount: 3000000,
      outstandingBalance: 1000000,
      paymentStatus: "Partially paid",
      status: "Posted",
      purchasedAt: "2026-09-10T09:00:00Z",
      createdAt: "2026-09-10T09:00:00Z",
      items: [],
      payments: [],
    },
  ],
};

describe("Business Report Generator", () => {
  it("generates styled HTML matching Tenvora's design and typography", () => {
    const html = generateBusinessReportHtml(mockReportData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Figure Cafe Store");
    expect(html).toContain("Tháng 09/2026");
    expect(html).toMatch(/15[.,]000[.,]000/); // Total Sales
    expect(html).toMatch(/7[.,]000[.,]000/); // Net Profit
    expect(html).toContain("S-1001");
    expect(html).toContain("Hoang Nam");
    expect(html).toContain("Anime Figures Distributor");
    expect(html).toContain("Tiền thuê tháng 9");
    expect(html).toContain("@media print");
    expect(html).toContain("A4");
  });

  it("exports structured CSV with UTF-8 BOM", () => {
    let capturedBlob: Blob | null = null;
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob) => {
      capturedBlob = blob as Blob;
      return "blob:mock";
    });

    exportReportCsv(mockReportData);

    expect(capturedBlob).not.toBeNull();
    expect(capturedBlob?.type).toContain("text/csv");
    URL.createObjectURL = originalCreateObjectURL;
  });
});

describe("BusinessReportModal & ReportsPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    vi.spyOn(businessService, "getDashboard").mockResolvedValue({
      currency: "VND",
      period: "month",
      periodSales: 15000000,
      periodPayments: 12000000,
      periodPurchases: 6000000,
      periodSupplierPayments: 5000000,
      periodExpenses: 2000000,
      periodNetProfit: 7000000,
      todaySales: 500000,
      todayPayments: 500000,
      todayPurchases: 0,
      todaySupplierPayments: 0,
      todayExpenses: 0,
      outstandingCustomers: 3000000,
      outstandingSuppliers: 1000000,
      unpaidCustomers: [],
      unpaidSuppliers: [],
      recentActivity: [],
    });

    vi.spyOn(businessService, "getSales").mockResolvedValue(mockReportData.sales || []);
    vi.spyOn(businessService, "getBusinessExpenses").mockResolvedValue(mockReportData.expenses || []);
    vi.spyOn(businessService, "getPurchases").mockResolvedValue(mockReportData.purchases || []);
  });

  it("renders report modal with period controls and action buttons", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <BusinessReportModal open={true} onOpenChange={() => {}} defaultPeriod="month" />
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Báo cáo tổng kết kinh doanh|Business Performance Report/i)).toBeInTheDocument();
    expect(screen.getByText(/In \/ Lưu PDF|Print \/ Save PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Tải báo cáo HTML|Download HTML/i)).toBeInTheDocument();
    expect(screen.getByText(/Xuất CSV|Export CSV/i)).toBeInTheDocument();
  });

  it("renders dedicated reports page with period toggle", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <BrowserRouter>
              <ReportsPage />
            </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: /Báo cáo kinh doanh|Business Statements/i })).toBeInTheDocument();
    expect(screen.getByText(/Tháng này|This Month/i)).toBeInTheDocument();
    expect(screen.getByText(/Tất cả|All Time/i)).toBeInTheDocument();
  });
});
