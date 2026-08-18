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
        email: "finance@company.com",
        role: "Manager",
        companyName: "Acme Corp",
      },
    }),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("DashboardLayout Component", () => {
  it("renders navigation links and child content without runtime errors", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <DashboardLayout>
            <div data-testid="test-content">Dashboard Content</div>
          </DashboardLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByText("VeriSpend")).toBeInTheDocument();
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    expect(screen.getByText("New Expense")).toBeInTheDocument();
    expect(screen.getByText("Upload Receipt")).toBeInTheDocument();
  });
});
