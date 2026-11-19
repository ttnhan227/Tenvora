import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RecordImageField } from "@/components/business/RecordImageField";
import { CreatableCombobox } from "@/components/business/CreatableCombobox";
import { DataTable } from "@/components/design-system/DataTable";
import { FilterBar } from "@/components/design-system/FilterBar";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import SettingsPage from "@/pages/settings/SettingsPage";

const mockAuthValue = {
  user: {
    id: "u-1",
    tenantId: "t-1",
    email: "owner@example.test",
    companyName: "Example Store",
    businessType: "retail",
    preferredCurrency: "VND",
    fullName: "Owner",
    role: "TenantAdmin",
    hasPassword: true,
    googleLinked: false,
    isActive: true,
    onboardingCompleted: true,
  },
  login: vi.fn(async () => false),
  register: vi.fn(async () => ({ success: false })),
  googleLogin: vi.fn(async () => ({ success: false })),
  updateSettings: vi.fn(async () => true),
  setPassword: vi.fn(async () => ({ success: true })),
  logout: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

describe("TEN-WEB-03: Forms and keyboard accessibility", () => {
  it("renders SettingsPage business-type and language selectors as accessible toggle buttons", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageProvider defaultLanguage="en">
            <SettingsPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const retailBtn = screen.getByRole("button", { name: /Retail|Tạp hoá/i });
    const foodBtn = screen.getByRole("button", { name: /Food|Quán ăn/i });
    expect(retailBtn).toHaveAttribute("aria-pressed", "true");
    expect(foodBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(foodBtn);
    expect(foodBtn).toHaveAttribute("aria-pressed", "true");

    const displayTab = screen.getByRole("button", { name: /Display|Ngôn ngữ/i });
    fireEvent.click(displayTab);

    const englishCard = screen.getByRole("button", { name: /English/i });
    expect(englishCard).toHaveAttribute("aria-pressed");
  });

  it("wires RecordImageField label to a real upload button and triggers hidden file input click", () => {
    const { container } = render(
      <LanguageProvider defaultLanguage="en">
        <RecordImageField label="Product photo" helpText="PNG or JPG" onChange={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("group", { name: "Product photo" })).toBeInTheDocument();
    const triggerBtn = screen.getByRole("button", { name: /Choose image/i });
    expect(triggerBtn).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click").mockImplementation(() => {});
    fireEvent.click(triggerBtn);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard listbox navigation and labeled quick-create fields in CreatableCombobox", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider defaultLanguage="en">
          <CreatableCombobox
            entityType="customer"
            value=""
            onChange={vi.fn()}
            options={[
              { id: "c1", label: "Alice Bakery" },
              { id: "c2", label: "Bob Coffee" },
            ]}
          />
        </LanguageProvider>
      </QueryClientProvider>,
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    const listbox = screen.getByRole("listbox");
    expect(trigger).toHaveAttribute("aria-controls", listbox.id);
    expect(screen.getByLabelText(/Search or type new name/i)).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
  });

  it("supports <th scope='col'> and keyboard Enter row activation in DataTable plus <search> in FilterBar", () => {
    const onRowClick = vi.fn();

    const { container } = render(
      <LanguageProvider defaultLanguage="en">
        <div>
          <FilterBar searchQuery="" onSearchChange={vi.fn()} searchLabel="Search sales" />
          <DataTable
            data={[{ id: "r1", name: "Sale #1" }]}
            keyExtractor={(item) => item.id}
            onRowClick={onRowClick}
            columns={[{ key: "name", header: "Order" }]}
          />
        </div>
      </LanguageProvider>,
    );

    expect(screen.getByRole("search", { name: "Search sales" })).toBeInTheDocument();
    const header = container.querySelector("th");
    expect(header).toHaveAttribute("scope", "col");

    const dataRow = screen.getByText("Sale #1").closest("tr") as HTMLTableRowElement;
    expect(dataRow).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(dataRow, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledWith({ id: "r1", name: "Sale #1" });
  });

  it("links inline form errors with aria-describedby and provides password visibility toggles on Login and Register", () => {
    const { container: loginContainer, unmount } = render(
      <MemoryRouter>
        <LanguageProvider fixedLanguage="en">
          <Login />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(loginContainer.querySelector("form")).toHaveAttribute("novalidate");
    const showBtn = screen.getByRole("button", { name: "Show password" });
    expect(showBtn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(showBtn);
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");

    fireEvent.submit(loginContainer.querySelector("form")!);
    expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-describedby", "login-email-error");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-describedby", "login-password-error");
    unmount();

    const { container: registerContainer } = render(
      <MemoryRouter>
        <LanguageProvider fixedLanguage="en">
          <Register />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Create a password")).toHaveAttribute("aria-describedby", "password-help");
    fireEvent.submit(registerContainer.querySelector("form")!);
    expect(screen.getByLabelText("Create a password")).toHaveAttribute("aria-describedby", "password-error");
  });
});
