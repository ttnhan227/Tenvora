import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "owner@example.test", role: "OperationsManager", companyName: "Example Business", onboardingCompleted: false },
    logout: vi.fn(),
  }),
}));

describe("Business workspace navigation", () => {
  it("exposes the complete business workflow", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageProvider defaultLanguage="en">
            <DashboardLayout>
              <p>Business workspace content</p>
            </DashboardLayout>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const linkNames = Array.from(container.querySelectorAll("a"), (link) => link.textContent?.trim());
    expect(linkNames).toEqual(expect.arrayContaining([
      "Home", "Sales", "Customers", "Products", "Purchases", "Suppliers", "Expenses",
    ]));
    for (const section of ["Today", "Record book", "Business operations", "Business setup"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    expect(screen.queryByText("What do you use Tenvora for?")).not.toBeInTheDocument();
  });
});
