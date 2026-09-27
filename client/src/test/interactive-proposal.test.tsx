import { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InteractiveProposalCard } from "@/components/assistant/InteractiveProposalCard";
import { businessService } from "@/services/businessService";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/services/businessService", () => ({
  businessService: {
    createProduct: vi.fn(),
    createCustomer: vi.fn(),
    createSupplier: vi.fn(),
    createBusinessExpense: vi.fn(),
  },
  apiError: vi.fn((_, fb) => fb),
}));

function renderCard(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LanguageProvider defaultLanguage="vi">{ui}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("InteractiveProposalCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders editable product inputs and creates product directly", async () => {
    const onDecision = vi.fn();
    const onCustomExecuted = vi.fn();

    vi.mocked(businessService.createProduct).mockResolvedValueOnce({
      id: "prod-1",
      name: "cappuccino",
      unit: "cup",
      defaultPrice: 35000,
      costPrice: 15000,
      stockQuantity: 100,
      currency: "VND",
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    renderCard(
      <InteractiveProposalCard
        proposal={{
          intent: "create_product",
          status: "PendingConfirmation",
          riskLevel: "Low",
          requiresConfirmation: true,
          summary: "Tạo sản phẩm cappuchino?",
          details: {
            Product: "cappuchino",
            Unit: "item",
            "Default price": "0 VND",
          },
        }}
        busy={false}
        isVietnamese={true}
        currency="VND"
        onDecision={onDecision}
        onCustomExecuted={onCustomExecuted}
      />
    );

    const nameInput = screen.getByDisplayValue("cappuchino");
    expect(nameInput).toBeInTheDocument();

    const unitInput = screen.getByDisplayValue("item");
    fireEvent.change(unitInput, { target: { value: "cup" } });

    const priceInput = screen.getByPlaceholderText("0");
    fireEvent.change(priceInput, { target: { value: "35000" } });

    const saveButton = screen.getByRole("button", { name: /Lưu & Tạo sản phẩm/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(businessService.createProduct).toHaveBeenCalledWith({
        name: "cappuchino",
        unit: "cup",
        defaultPrice: 35000,
      });
      expect(onCustomExecuted).toHaveBeenCalled();
    });
  });

  it("filters out single-letter article 'a' and allows typing customer name directly", async () => {
    const onDecision = vi.fn();
    const onCustomExecuted = vi.fn();

    vi.mocked(businessService.createCustomer).mockResolvedValueOnce({
      id: "cust-1",
      name: "Anh Minh",
      phone: "0901234567",
      status: "Active",
      currency: "VND",
      totalSales: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
    });

    renderCard(
      <InteractiveProposalCard
        proposal={{
          intent: "create_customer",
          status: "NeedsClarification",
          riskLevel: "Low",
          requiresConfirmation: true,
          summary: "Bạn muốn đặt tên khách hàng là gì và số điện thoại nào?",
          details: {
            Name: "a", // Even if backend had passed "a", card strips it
          },
        }}
        busy={false}
        isVietnamese={true}
        currency="VND"
        onDecision={onDecision}
        onCustomExecuted={onCustomExecuted}
      />
    );

    // Name input should be empty, not "a"
    const nameInput = screen.getByPlaceholderText(/Nhập tên khách hàng/i);
    expect(nameInput).toHaveValue("");

    fireEvent.change(nameInput, { target: { value: "Anh Minh" } });

    const phoneInput = screen.getByPlaceholderText(/0912/i);
    fireEvent.change(phoneInput, { target: { value: "0901234567" } });

    const saveButton = screen.getByRole("button", { name: /Lưu & Tạo khách hàng/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(businessService.createCustomer).toHaveBeenCalledWith({
        name: "Anh Minh",
        phone: "0901234567",
        address: undefined,
        email: undefined,
      });
      expect(onCustomExecuted).toHaveBeenCalled();
    });
  });

  it("renders editable expense fields and records expense", async () => {
    const onDecision = vi.fn();
    const onCustomExecuted = vi.fn();

    vi.mocked(businessService.createBusinessExpense).mockResolvedValueOnce({
      id: "exp-1",
      category: "Tiền điện",
      amount: 450000,
      currency: "VND",
      expenseDate: new Date().toISOString(),
      description: "Tháng 9",
      createdAt: new Date().toISOString(),
    });

    renderCard(
      <InteractiveProposalCard
        proposal={{
          intent: "expense",
          status: "PendingConfirmation",
          riskLevel: "Financial",
          requiresConfirmation: true,
          summary: "Ghi khoản chi 450.000 VND?",
          details: {
            Category: "Tiền điện",
            Amount: "450.000 VND",
            Description: "Tháng 9",
          },
        }}
        busy={false}
        isVietnamese={true}
        currency="VND"
        onDecision={onDecision}
        onCustomExecuted={onCustomExecuted}
      />
    );

    const catInput = screen.getByDisplayValue("Tiền điện");
    expect(catInput).toBeInTheDocument();

    const descInput = screen.getByDisplayValue("Tháng 9");
    expect(descInput).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /Xác nhận & Ghi chi phí/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(businessService.createBusinessExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "Tiền điện",
          amount: 450000,
          description: "Tháng 9",
        })
      );
      expect(onCustomExecuted).toHaveBeenCalled();
    });
  });
});
