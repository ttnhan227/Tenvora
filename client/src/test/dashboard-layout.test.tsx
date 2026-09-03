import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";

// Mock authService
vi.mock("@/services/authService", () => ({
  authService: {
    getProfile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "user-1",
        email: "ops@tenvora.internal",
        role: "OperationsManager",
        companyName: "Tenvora Global Payments",
      },
    }),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("DashboardLayout Component", () => {
  it("renders Tenvora enterprise navigation hierarchy and child content", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <DashboardLayout>
            <div data-testid="test-content">Operations Console</div>
          </DashboardLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getAllByText("Tenvora").length).toBeGreaterThan(0);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Transfers")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Accounts")).toBeInTheDocument();
    expect(screen.getByText("Ledger")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Settlements")).toBeInTheDocument();
    expect(screen.getByText("Risk Review")).toBeInTheDocument();
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
  });
});
