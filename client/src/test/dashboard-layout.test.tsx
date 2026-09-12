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
    render(
      <MemoryRouter>
        <DashboardLayout>
          <p>Freelancer dashboard content</p>
        </DashboardLayout>
      </MemoryRouter>
    );
    for (const name of ["Home", "Invoices", "Clients", "Income", "Taxes", "Assistant", "Settings"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Team" })).not.toBeInTheDocument();
  });
});
