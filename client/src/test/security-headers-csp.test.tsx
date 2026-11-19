import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { generateBusinessReportHtml, printReport, BusinessReportData } from "@/lib/reportGenerator";
import { ReceiptModal } from "@/components/business/ReceiptModal";
import { CustomerStatementModal } from "@/components/business/CustomerStatementModal";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { businessService } from "@/services/businessService";
import nginxConf from "../../nginx.conf?raw";

const sampleReport: BusinessReportData = {
  companyName: "Cafe Tenvora",
  currency: "USD",
  period: "month",
  periodLabel: "11/2026",
  dateRangeLabel: "01/11/2026 - 30/11/2026",
  isVietnamese: false,
  totalSales: 1000,
  salesCount: 2,
  totalCollected: 900,
  totalPurchases: 400,
  purchasesCount: 1,
  totalSupplierPaid: 400,
  totalExpenses: 100,
  expensesCount: 1,
  netProfit: 500,
  outstandingCustomers: 100,
  outstandingSuppliers: 0,
  sales: [],
  expenses: [],
  purchases: [],
};

describe("TEN-WEB-05: CSP hygiene, safe printing, and Nginx security headers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates report HTML without inline event handlers and prints via Blob URL without document.write", () => {
    const html = generateBusinessReportHtml(sampleReport);
    expect(html).not.toMatch(/\sonclick=/i);
    expect(html).toContain('id="tenvora-print-btn"');

    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/report-1");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const mockPopup = {
      opener: window,
      document: { getElementById: vi.fn(() => null) },
      addEventListener: vi.fn(),
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(mockPopup);

    printReport(sampleReport);

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith("blob:http://localhost/report-1", "_blank");
    expect(mockPopup.opener).toBeNull();
    revokeSpy.mockRestore();
  });

  it("moves modal print rules out of inline JSX <style> tags into index.css", async () => {
    const { unmount } = render(
      <LanguageProvider fixedLanguage="en">
        <ReceiptModal
          open={true}
          onOpenChange={vi.fn()}
          companyName="Cafe Tenvora"
          sale={{
            id: "s-1",
            saleNumber: "SO-101",
            customerId: "c-1",
            customerName: "Walk-in",
            currency: "USD",
            totalAmount: 100,
            paidAmount: 100,
            outstandingBalance: 0,
            paymentStatus: "Paid",
            status: "Posted",
            soldAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            items: [],
            payments: [],
          }}
        />
      </LanguageProvider>,
    );
    expect(document.getElementById("printable-receipt")?.querySelector("style")).toBeNull();
    expect(screen.getByText("SO-101")).toBeInTheDocument();
    unmount();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(businessService, "getCustomerStatement").mockResolvedValue({
      customer: {
        id: "c-1",
        name: "Alice",
        phone: "0900",
        totalPurchased: 100,
        totalPaid: 100,
        outstandingBalance: 0,
      },
      currency: "USD",
      totalDebits: 100,
      totalCredits: 100,
      closingBalance: 0,
      entries: [],
    } as never);

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider fixedLanguage="en">
          <CustomerStatementModal
            open={true}
            onOpenChange={vi.fn()}
            customerId="c-1"
            customerName="Alice"
            companyName="Cafe Tenvora"
          />
        </LanguageProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(document.getElementById("printable-statement")).not.toBeNull();
    });
    expect(document.getElementById("printable-statement")?.querySelector("style")).toBeNull();
  });

  it("configures Nginx security headers, CSP, Report-Only Trusted Types, and inherits headers in /assets/", () => {
    expect(nginxConf).toContain('add_header X-XSS-Protection "0" always;');
    expect(nginxConf).toContain("add_header Content-Security-Policy ");
    expect(nginxConf).toContain("object-src 'none'");
    expect(nginxConf).toContain("base-uri 'none'");
    expect(nginxConf).toContain("frame-ancestors 'none'");
    expect(nginxConf).toContain("https://accounts.google.com/gsi/client");
    expect(nginxConf).toContain("add_header Content-Security-Policy-Report-Only \"require-trusted-types-for 'script';\" always;");

    const assetsBlock = nginxConf.split("location /assets/ {")[1]?.split("}")[0] ?? "";
    expect(assetsBlock).toContain('add_header Cache-Control "public, immutable" always;');
    expect(assetsBlock).toContain("add_header Content-Security-Policy ");
    expect(assetsBlock).toContain('add_header X-Content-Type-Options "nosniff" always;');
  });
});
