import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CustomersPage from "@/pages/business/CustomersPage";
import SuppliersPage from "@/pages/business/SuppliersPage";
import ProductsPage from "@/pages/business/ProductsPage";
import CustomerDetailPage from "@/pages/business/CustomerDetailPage";
import ReportsPage from "@/pages/business/ReportsPage";
import { businessService } from "@/services/businessService";

vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { role: "TenantAdmin", companyName: "Fixture", preferredCurrency: "USD" } }), useOptionalAuth: () => ({ user: { role: "TenantAdmin" } }) }));
vi.mock("@/services/businessService", async importOriginal => ({
  ...await importOriginal<typeof import("@/services/businessService")>(),
  businessService: { getCustomersPaged: vi.fn(), getSuppliersPaged: vi.fn(), getProductsPaged: vi.fn(), getCustomers: vi.fn(), getCustomer: vi.fn(), getDashboard: vi.fn(), getSales: vi.fn(), getBusinessExpenses: vi.fn(), getPurchases: vi.fn() },
}));
const empty = { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 20 };
function show(page: ReactNode, route = "/") {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[route]}><LanguageProvider defaultLanguage="en">{page}</LanguageProvider></MemoryRouter></QueryClientProvider>);
}
describe("list failure recovery", () => {
  beforeEach(() => vi.resetAllMocks());
  it("does not present a failed customer request as a missing record", async () => {
    vi.mocked(businessService.getCustomer).mockRejectedValue(new Error("Network Error"));
    show(<Routes><Route path="/customers/:id" element={<CustomerDetailPage />} /></Routes>, "/customers/fixture");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load data");
    expect(screen.queryByText("Customer not found")).not.toBeInTheDocument();
  });
  it("does not display or export fabricated zero totals when reports fail", async () => {
    for (const method of ["getDashboard", "getSales", "getBusinessExpenses", "getPurchases"] as const) vi.mocked(businessService[method]).mockRejectedValue(new Error("Network Error"));
    show(<ReportsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load data");
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Print \/ Save PDF/i })).toBeDisabled();
    expect(screen.queryByText("Gross Revenue")).not.toBeInTheDocument();
  });
  for (const [name, Page, method] of [
    ["customers", CustomersPage, "getCustomersPaged"],
    ["suppliers", SuppliersPage, "getSuppliersPaged"],
    ["products", ProductsPage, "getProductsPaged"],
  ] as const) {
    it(`${name} shows a recoverable error instead of claiming an empty workspace`, async () => {
      vi.mocked(businessService[method]).mockRejectedValueOnce(new Error("Network Error")).mockResolvedValue(empty);
      show(<Page />);
      expect(await screen.findByRole("alert")).toHaveTextContent("Could not load data");
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
      expect(businessService[method]).toHaveBeenCalledTimes(2);
    });
  }
  for (const [Page, method] of [[CustomersPage, "getCustomersPaged"], [SuppliersPage, "getSuppliersPaged"]] as const) {
    it(`${method} explicitly requests all statuses`, async () => {
      vi.mocked(businessService[method]).mockResolvedValue(empty);
      show(<Page />);
      fireEvent.click(screen.getByRole("button", { name: /^All$/ }));
      await waitFor(() => expect(businessService[method]).toHaveBeenLastCalledWith("", "", 1, 20));
    });
  }
});
