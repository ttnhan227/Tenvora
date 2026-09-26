import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/DashboardLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "owner@example.test", role: "OperationsManager", companyName: "Example Business" },
    logout: vi.fn(),
  }),
}));

describe("Business workspace navigation", () => {
  it("exposes the complete business workflow", () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardLayout>
          <p>Business workspace content</p>
        </DashboardLayout>
      </MemoryRouter>
    );
    const linkNames = Array.from(container.querySelectorAll("a"), (link) => link.textContent?.trim());
    expect(linkNames).toEqual(expect.arrayContaining([
      "Home", "Sales", "Customers", "Products", "Purchases", "Suppliers", "Expenses",
    ]));
    for (const section of ["Today", "Record book", "Business setup"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
  });
});
