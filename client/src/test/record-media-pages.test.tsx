import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import apiClient from "@/services/apiClient";
import {
  BusinessExpense,
  businessService,
  Product,
  Purchase,
} from "@/services/businessService";
import BusinessExpensesPage from "@/pages/business/BusinessExpensesPage";
import ProductsPage from "@/pages/business/ProductsPage";
import PurchasesPage from "@/pages/business/PurchasesPage";

vi.mock("@/contexts/AuthContext", () => {
  const authValue = {
    user: {
      email: "owner@example.test",
      role: "OperationsManager",
      companyName: "Example Business",
      currency: "USD",
      onboardingCompleted: true,
    },
    logout: vi.fn(),
  };
  return {
    useAuth: () => authValue,
    useOptionalAuth: () => authValue,
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LanguageProvider defaultLanguage="en">
          {ui}
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TEN-04 split-origin record media resolution on list pages", () => {
  let prevBaseUrl: string | undefined;

  beforeEach(() => {
    prevBaseUrl = apiClient.defaults.baseURL;
    apiClient.defaults.baseURL = "https://api.tenvora.example/api";
  });

  afterEach(() => {
    apiClient.defaults.baseURL = prevBaseUrl;
    vi.restoreAllMocks();
  });

  it("resolves /uploads/ paths and preserves hosted URLs in BusinessExpensesPage", async () => {
    const expenses: BusinessExpense[] = [
      {
        id: "exp-local",
        category: "Utilities",
        amount: 50,
        currency: "USD",
        expenseDate: "2026-11-19T00:00:00Z",
        createdAt: "2026-11-19T00:00:00Z",
        description: "Local upload expense",
        receiptImageDataUrl: "/uploads/tenvora/t1/expenses/local.jpg",
      },
      {
        id: "exp-supabase",
        category: "Supplies",
        amount: 25,
        currency: "USD",
        expenseDate: "2026-11-19T00:00:00Z",
        createdAt: "2026-11-19T00:00:00Z",
        description: "Supabase upload expense",
        receiptImageDataUrl: "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/supa.webp",
      },
      {
        id: "exp-missing",
        category: "Other",
        amount: 10,
        currency: "USD",
        expenseDate: "2026-11-19T00:00:00Z",
        createdAt: "2026-11-19T00:00:00Z",
        description: "No receipt expense",
        receiptImageDataUrl: "   ",
      },
    ];
    vi.spyOn(businessService, "getBusinessExpenses").mockResolvedValue(expenses);

    const { container } = renderWithProviders(<BusinessExpensesPage />);
    await waitFor(() => expect(screen.getByText("Local upload expense")).toBeInTheDocument());

    const links = screen.getAllByRole("link", { name: "Open receipt image" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://api.tenvora.example/uploads/tenvora/t1/expenses/local.jpg");
    expect(links[1]).toHaveAttribute(
      "href",
      "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/supa.webp"
    );

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", "https://api.tenvora.example/uploads/tenvora/t1/expenses/local.jpg");
    expect(imgs[1]).toHaveAttribute(
      "src",
      "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/supa.webp"
    );
  });

  it("resolves /uploads/ paths and preserves HTTP(S) URLs in ProductsPage", async () => {
    const products: Product[] = [
      {
        id: "prod-local",
        name: "Local Coffee",
        sku: "COF-1",
        unit: "bag",
        defaultPrice: 12,
        costPrice: 6,
        currency: "USD",
        stockQuantity: 10,
        minStockLevel: 2,
        trackInventory: true,
        isActive: true,
        createdAt: "2026-11-19T00:00:00Z",
        imageDataUrl: "/uploads/tenvora/t1/products/coffee.png",
      },
      {
        id: "prod-http",
        name: "Hosted Tea",
        sku: "TEA-1",
        unit: "box",
        defaultPrice: 15,
        costPrice: 7,
        currency: "USD",
        stockQuantity: 8,
        minStockLevel: 2,
        trackInventory: true,
        isActive: true,
        createdAt: "2026-11-19T00:00:00Z",
        imageDataUrl: "https://cdn.example.com/tea.jpg",
      },
      {
        id: "prod-empty",
        name: "Plain Mug",
        sku: "MUG-1",
        unit: "item",
        defaultPrice: 8,
        costPrice: 3,
        currency: "USD",
        stockQuantity: 5,
        minStockLevel: 1,
        trackInventory: true,
        isActive: true,
        createdAt: "2026-11-19T00:00:00Z",
        imageDataUrl: undefined,
      },
    ];
    vi.spyOn(businessService, "getProductsPaged").mockResolvedValue({
      items: products,
      totalCount: products.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    vi.spyOn(businessService, "getProducts").mockResolvedValue(products);

    renderWithProviders(<ProductsPage />);
    await waitFor(() => expect(screen.getByText("Local Coffee")).toBeInTheDocument());

    expect(screen.getByAltText("Local Coffee")).toHaveAttribute(
      "src",
      "https://api.tenvora.example/uploads/tenvora/t1/products/coffee.png"
    );
    expect(screen.getByAltText("Hosted Tea")).toHaveAttribute(
      "src",
      "https://cdn.example.com/tea.jpg"
    );
    expect(screen.queryByAltText("Plain Mug")).not.toBeInTheDocument();
  });

  it("resolves /uploads/ paths and preserves Supabase URLs in PurchasesPage", async () => {
    const purchases: Purchase[] = [
      {
        id: "pur-local",
        purchaseNumber: "PO-001",
        supplierId: "sup-1",
        supplierName: "Acme Supply",
        currency: "USD",
        purchasedAt: "2026-11-19T00:00:00Z",
        createdAt: "2026-11-19T00:00:00Z",
        totalAmount: 200,
        paidAmount: 200,
        outstandingBalance: 0,
        paymentStatus: "Paid",
        status: "Posted",
        invoiceImageDataUrl: "/uploads/tenvora/t1/purchases/inv-1.jpg",
        items: [],
        payments: [],
      },
      {
        id: "pur-supa",
        purchaseNumber: "PO-002",
        supplierId: "sup-1",
        supplierName: "Beta Supply",
        currency: "USD",
        purchasedAt: "2026-11-19T00:00:00Z",
        createdAt: "2026-11-19T00:00:00Z",
        totalAmount: 100,
        paidAmount: 0,
        outstandingBalance: 100,
        paymentStatus: "Unpaid",
        status: "Posted",
        invoiceImageDataUrl: "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/inv-2.png",
        items: [],
        payments: [],
      },
      {
        id: "pur-empty",
        purchaseNumber: "PO-003",
        supplierId: "sup-1",
        supplierName: "Gamma Supply",
        currency: "USD",
        purchasedAt: "2026-11-19T00:00:00Z",
        createdAt: "2026-11-19T00:00:00Z",
        totalAmount: 50,
        paidAmount: 0,
        outstandingBalance: 50,
        paymentStatus: "Unpaid",
        status: "Posted",
        invoiceImageDataUrl: "",
        items: [],
        payments: [],
      },
    ];
    vi.spyOn(businessService, "getPurchasesPaged").mockResolvedValue({
      items: purchases,
      totalCount: purchases.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    vi.spyOn(businessService, "getSuppliers").mockResolvedValue([
      {
        id: "sup-1",
        name: "Acme Supply",
        status: "Active",
        currency: "USD",
        totalPurchases: 350,
        totalPaid: 200,
        outstandingBalance: 150,
        purchaseCount: 3,
        createdAt: "2026-11-19T00:00:00Z",
      },
    ]);
    vi.spyOn(businessService, "getProducts").mockResolvedValue([]);

    const { container } = renderWithProviders(<PurchasesPage />);
    await waitFor(() => expect(screen.getByText("PO-001")).toBeInTheDocument());

    const links = screen.getAllByRole("link", { name: "Open invoice image" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://api.tenvora.example/uploads/tenvora/t1/purchases/inv-1.jpg");
    expect(links[1]).toHaveAttribute(
      "href",
      "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/inv-2.png"
    );

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", "https://api.tenvora.example/uploads/tenvora/t1/purchases/inv-1.jpg");
    expect(imgs[1]).toHaveAttribute(
      "src",
      "https://proj.supabase.co/storage/v1/object/public/receipts/tenvora/t1/inv-2.png"
    );
  });
});
