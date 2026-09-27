import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AccountSecurityDialog } from "@/components/AccountSecurityDialog";
import apiClient from "@/services/apiClient";
import * as AuthContextModule from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/services/apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("AccountSecurityDialog", () => {
  const mockSetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderDialog = () => render(<LanguageProvider defaultLanguage="en"><AccountSecurityDialog open={true} onOpenChange={vi.fn()} /></LanguageProvider>);

  it("renders 'Set a Password' form when user does not have a password (Google sign-up)", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        email: "googleuser@example.com",
        role: "TenantAdmin",
        isActive: true,
        preferredCurrency: "USD",
        companyName: "Acme Studio",
        googleLinked: true,
        hasPassword: false,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      googleLogin: vi.fn(),
      register: vi.fn(),
      setPassword: mockSetPassword,
      completeOnboarding: vi.fn(),
      updateSettings: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    renderDialog();

    expect(screen.getByText("Security Credentials")).toBeInTheDocument();
    expect(screen.getByText("Set a Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set password" })).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("renders 'Change Password' form when user already has a password", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "user-2",
        tenantId: "tenant-1",
        email: "regularuser@example.com",
        role: "TenantAdmin",
        isActive: true,
        preferredCurrency: "USD",
        companyName: "Acme Studio",
        googleLinked: false,
        hasPassword: true,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      googleLogin: vi.fn(),
      register: vi.fn(),
      setPassword: mockSetPassword,
      completeOnboarding: vi.fn(),
      updateSettings: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    renderDialog();

    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });

  it("validates password length and complexity before submitting", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        email: "googleuser@example.com",
        role: "TenantAdmin",
        isActive: true,
        preferredCurrency: "USD",
        companyName: "Acme Studio",
        googleLinked: true,
        hasPassword: false,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      googleLogin: vi.fn(),
      register: vi.fn(),
      setPassword: mockSetPassword,
      completeOnboarding: vi.fn(),
      updateSettings: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    renderDialog();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "weak" } });
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));

    expect(screen.getByText("Use 12 or more characters with uppercase, lowercase, and a number.")).toBeInTheDocument();
    expect(mockSetPassword).not.toHaveBeenCalled();
  });

  it("successfully calls setPassword and displays success confirmation", async () => {
    mockSetPassword.mockResolvedValueOnce({ success: true, message: "Password updated successfully." });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        email: "googleuser@example.com",
        role: "TenantAdmin",
        isActive: true,
        preferredCurrency: "USD",
        companyName: "Acme Studio",
        googleLinked: true,
        hasPassword: false,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      googleLogin: vi.fn(),
      register: vi.fn(),
      setPassword: mockSetPassword,
      completeOnboarding: vi.fn(),
      updateSettings: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    renderDialog();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "ValidPassword123!" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "ValidPassword123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => {
      expect(mockSetPassword).toHaveBeenCalledWith(undefined, "ValidPassword123!");
      expect(screen.getByText(/Your password has been created/)).toBeInTheDocument();
    });
  });
});
