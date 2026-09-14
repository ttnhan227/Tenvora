import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/DashboardLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "alex@riveradesign.co", role: "SoloFreelancer", companyName: "Alex Rivera Design" },
    logout: vi.fn(),
  }),
}));

describe("Freelancer workspace navigation", () => {
  it("exposes primary freelancer routes and hides enterprise admin clutter", () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardLayout>
          <p>Freelancer dashboard content</p>
        </DashboardLayout>
      </MemoryRouter>
    );
    const linkNames = Array.from(container.querySelectorAll("a"), (link) => link.textContent?.trim());
    expect(linkNames).toEqual(expect.arrayContaining([
      "Dashboard", "Transactions", "Income", "Expenses", "Clients", "Projects", "Invoices", "Reports", "Settings",
    ]));
    for (const section of ["Overview", "Money", "Work", "Insights", "Account"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    expect(linkNames).not.toContain("Team");
  });
});
