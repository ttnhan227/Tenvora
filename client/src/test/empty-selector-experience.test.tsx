import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import SalesPage from "@/pages/business/SalesPage";
import PurchasesPage from "@/pages/business/PurchasesPage";
import { businessService } from "@/services/businessService";

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/businessService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/businessService")>();
  return {
    ...actual,
    businessService: {
      ...actual.businessService,
      getCustomers: vi.fn(),
      getProducts: vi.fn(),
      getSales: vi.fn(),
      getSalesPaged: vi.fn(),
      getSuppliers: vi.fn(),
      getPurchases: vi.fn(),
      getPurchasesPaged: vi.fn(),
    },
  };
});

function renderPage(page: ReactNode, route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <LanguageProvider defaultLanguage="en">{page}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("empty transaction selectors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(businessService.getCustomers).mockResolvedValue([]);
    vi.mocked(businessService.getProducts).mockResolvedValue([]);
    vi.mocked(businessService.getSales).mockResolvedValue([]);
    vi.mocked(businessService.getSuppliers).mockResolvedValue([]);
    vi.mocked(businessService.getPurchases).mockResolvedValue([]);
    const emptyPage = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
    vi.mocked(businessService.getSalesPaged).mockResolvedValue(emptyPage);
    vi.mocked(businessService.getPurchasesPaged).mockResolvedValue(emptyPage);
  });

  it("shows customer and product setup actions instead of empty sale dropdowns", async () => {
    renderPage(<SalesPage />, "/sales?create=1");

    await waitFor(() => expect(screen.getByText("No customers available")).toBeInTheDocument());
    expect(screen.getByText("No products or services available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create customer/i })).toHaveAttribute(
      "href",
      "/customers?create=1&returnTo=%2Fsales%3Fcreate%3D1",
    );
    expect(screen.getByRole("link", { name: /Create product/i })).toHaveAttribute(
      "href",
      "/products?create=1&returnTo=%2Fsales%3Fcreate%3D1",
    );
    expect(screen.queryByText("Choose the customer")).not.toBeInTheDocument();
  });

  it("shows supplier setup and an optional product shortcut for purchases", async () => {
    renderPage(<PurchasesPage />, "/purchases?create=1");

    await waitFor(() => expect(screen.getByText("No suppliers available")).toBeInTheDocument());
    expect(screen.getByText("No products to link yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create supplier/i })).toHaveAttribute(
      "href",
      "/suppliers?create=1&returnTo=%2Fpurchases%3Fcreate%3D1",
    );
    expect(screen.getByRole("link", { name: /Create product/i })).toHaveAttribute(
      "href",
      "/products?create=1&returnTo=%2Fpurchases%3Fcreate%3D1",
    );
    expect(screen.queryByText("Choose a supplier")).not.toBeInTheDocument();
  });
  it.each([
    ["sale", () => <SalesPage />, "/sales?create=1", "getCustomers", "No customers available"],
    ["purchase", () => <PurchasesPage />, "/purchases?create=1", "getSuppliers", "No suppliers available"],
  ] as const)("recovers failed %s selectors before offering setup", async (_name, page, route, method, emptyText) => {
    vi.mocked(businessService[method]).mockRejectedValueOnce(new Error("offline"));
    renderPage(page(), route);
    await screen.findByText("Could not load data");
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText(emptyText);
  });

});
