import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { GettingStartedGuide } from "@/components/business/GettingStartedGuide";
import * as AuthContextModule from "@/contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";

describe("Onboarding and Tailored Workspace Experience", () => {
  const mockCompleteOnboarding = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders 4 business types in Step 1 and allows navigating through setup", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        email: "owner@example.com",
        role: "TenantAdmin",
        isActive: true,
        preferredCurrency: "USD",
        companyName: "Sunny Coffee Shop",
        googleLinked: true,
        hasPassword: false,
        onboardingCompleted: false,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      googleLogin: vi.fn(),
      register: vi.fn(),
      setPassword: vi.fn(),
      completeOnboarding: mockCompleteOnboarding,
      updateSettings: vi.fn(),
      logout: vi.fn(),

      refreshProfile: vi.fn(),
    });

    render(<LanguageProvider defaultLanguage="en"><OnboardingWizard open={true} onOpenChange={vi.fn()} /></LanguageProvider>);

    // Step 1: Check options
    expect(screen.getByText("What do you use Tenvora for?")).toBeInTheDocument();
    expect(screen.getByText("Retail Store or Shop")).toBeInTheDocument();
    expect(screen.getByText("Services & Clients")).toBeInTheDocument();
    expect(screen.getByText("Food, Café & Restaurant")).toBeInTheDocument();
    expect(screen.getByText("Simple Cashbook")).toBeInTheDocument();

    // Select Café / Food
    fireEvent.click(screen.getByText("Food, Café & Restaurant"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: Business Basics
    expect(screen.getByText("Let’s set up your business basics")).toBeInTheDocument();
    expect(screen.getByLabelText("Business or Shop Name")).toHaveValue("Sunny Coffee Shop");

    // Select VND currency
    fireEvent.click(screen.getByText("Vietnamese Đồng"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3: Summary
    expect(screen.getByText("Your workspace is ready!")).toBeInTheDocument();
    expect(screen.getByText("Daily Sales & Expenses")).toBeInTheDocument();
    expect(screen.getByText("VND")).toBeInTheDocument();

    mockCompleteOnboarding.mockResolvedValueOnce({
      success: true,
      data: {
        id: "user-1",
        tenantId: "tenant-1",
        email: "owner@example.com",
        role: "TenantAdmin",
        isActive: true,
        preferredCurrency: "VND",
        companyName: "Sunny Coffee Shop",
        businessType: "food",
        onboardingCompleted: true,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /launch my workspace/i }));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledWith(
        "Sunny Coffee Shop",
        "VND",
        "food"
      );
    });
  });

  it("renders GettingStartedGuide with tailored first steps based on business profile", () => {
    const handleOpenSettings = vi.fn();

    render(
      <BrowserRouter>
        <LanguageProvider defaultLanguage="en">
          <GettingStartedGuide
            companyName="Nhan Consulting"
            currency="EUR"
            businessType="services"
            hasActivity={false}
            onOpenSettings={handleOpenSettings}
          />
        </LanguageProvider>
      </BrowserRouter>
    );

    expect(screen.getByText("Let’s get Nhan Consulting up and running")).toBeInTheDocument();
    expect(screen.getByText("Clients & Invoices")).toBeInTheDocument();
    expect(screen.getByText("Add your first client")).toBeInTheDocument();
    expect(screen.getByText("Issue an invoice / sale")).toBeInTheDocument();
    expect(screen.getByText("Log a project expense")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /customize setup/i }));
    expect(handleOpenSettings).toHaveBeenCalledTimes(1);
  });
});
