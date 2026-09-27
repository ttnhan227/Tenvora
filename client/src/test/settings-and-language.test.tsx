import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import SettingsPage from "@/pages/settings/SettingsPage";

const mockUpdateSettings = vi.fn();
const mockSetPassword = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      tenantId: "t-1",
      email: "ba@example.com",
      companyName: "Tiệm Tạp Hoá Cô Ba",
      businessType: "retail",
      preferredCurrency: "VND",
      fullName: "Cô Ba",
      phoneNumber: "0901234567",
      role: "TenantAdmin",
      googleLinked: true,
      hasPassword: true,
      isActive: true,
      onboardingCompleted: true,
    },
    updateSettings: mockUpdateSettings,
    setPassword: mockSetPassword,
    logout: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

function LanguageConsumer() {
  const { language, setLanguage, t, isVietnamese } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="is-vi">{isVietnamese ? "yes" : "no"}</span>
      <span data-testid="greeting">{t("nav.home")}</span>
      <button onClick={() => setLanguage("en")}>To English</button>
      <button onClick={() => setLanguage("vi")}>To Vietnamese</button>
    </div>
  );
}

describe("Language & App Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("LanguageProvider defaults to Vietnamese and translates navigation", () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("lang").textContent).toBe("vi");
    expect(screen.getByTestId("is-vi").textContent).toBe("yes");
    expect(screen.getByTestId("greeting").textContent).toBe("Trang chủ");
  });

  it("LanguageToggle switches between Vietnamese and English on click", () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
        <LanguageConsumer />
      </LanguageProvider>
    );

    // Initial state is Vietnamese
    expect(screen.getByTestId("lang").textContent).toBe("vi");

    // Click toggle button
    const toggleBtn = screen.getByRole("button", { name: /switch to english/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("is-vi").textContent).toBe("no");
    expect(screen.getByTestId("greeting").textContent).toBe("Home");
  });

  it("SettingsPage renders tabs and allows updating store profile", async () => {
    mockUpdateSettings.mockResolvedValueOnce({ success: true });
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LanguageProvider>
            <SettingsPage />
          </LanguageProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Check tabs
    expect(screen.getByRole("button", { name: /^Cửa hàng$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ngôn ngữ & Hiển thị/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tài khoản & Mật khẩu/i })).toBeInTheDocument();


    // Check store name prefilled
    const storeInput = screen.getByLabelText(/Tên cửa hàng/i);
    expect(storeInput).toHaveValue("Tiệm Tạp Hoá Cô Ba");

    // Edit store name and submit
    fireEvent.change(storeInput, { target: { value: "Tiệm Tạp Hoá Cô Ba Mới" } });
    const submitBtn = screen.getByRole("button", { name: /Lưu thông tin cửa hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        "Tiệm Tạp Hoá Cô Ba Mới",
        "VND",
        "retail",
        "Cô Ba",
        "0901234567"
      );
    });
  });

  it("SettingsPage keeps display preferences focused on language and theme", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LanguageProvider>
            <SettingsPage />
          </LanguageProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Ngôn ngữ & Hiển thị/i }));
    expect(screen.getByText(/Ngôn ngữ hiển thị/i)).toBeInTheDocument();
    expect(screen.getByText(/Màu sắc giao diện/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dễ nhìn/i)).not.toBeInTheDocument();
  });
});
