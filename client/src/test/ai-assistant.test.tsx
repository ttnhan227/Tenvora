import { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AiQuickRecordBar } from "@/components/assistant/AiQuickRecordBar";
import { AiAssistantDialog } from "@/components/assistant/AiAssistantDialog";
import { aiAssistantService } from "@/services/aiService";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/services/aiService", () => ({
  aiAssistantService: {
    proposeAction: vi.fn(),
    confirmAction: vi.fn(),
    chat: vi.fn(),
    getStatus: vi.fn(),
  },
}));

function renderWithProviders(ui: ReactNode, route = "/dashboard") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <LanguageProvider defaultLanguage="vi">{ui}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Tenvora AI action workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("confirms a server-owned action id instead of resending financial fields", async () => {
    const onRecordSuccess = vi.fn();
    vi.mocked(aiAssistantService.proposeAction).mockResolvedValueOnce({
      success: true,
      data: {
        actionId: "11111111-1111-1111-1111-111111111111",
        intent: "debt_payment",
        status: "PendingConfirmation",
        riskLevel: "Financial",
        requiresConfirmation: true,
        summary: "Anh Nam hiện nợ 4.700.000 VND. Ghi nhận thanh toán 2.000.000 VND?",
        details: {
          Customer: "Anh Nam",
          Amount: "2.000.000 VND",
          "Balance after payment": "2.700.000 VND",
        },
      },
    });
    vi.mocked(aiAssistantService.confirmAction).mockResolvedValueOnce({
      success: true,
      data: {
        actionId: "11111111-1111-1111-1111-111111111111",
        status: "Executed",
        message: "Đã ghi nhận thanh toán. Anh Nam hiện còn nợ 2.700.000 VND.",
        recordType: "Payment",
        recordId: "22222222-2222-2222-2222-222222222222",
      },
    });

    renderWithProviders(<AiQuickRecordBar currency="VND" onRecordSuccess={onRecordSuccess} />);
    const input = screen.getByPlaceholderText(/anh Nam vừa trả 2 triệu/i);
    fireEvent.change(input, { target: { value: "Anh Nam vừa trả 2 triệu" } });
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra/i }));

    await waitFor(() => expect(screen.getByText(/Ghi nhận thanh toán 2.000.000 VND/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận ghi sổ/i }));

    await waitFor(() => {
      expect(aiAssistantService.confirmAction).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        true,
      );
      expect(onRecordSuccess).toHaveBeenCalled();
      expect(screen.getByText(/Anh Nam hiện còn nợ 2.700.000 VND/i)).toBeInTheDocument();
    });
  });

  it("sends current customer context with an action proposal", async () => {
    vi.mocked(aiAssistantService.proposeAction).mockResolvedValueOnce({
      success: true,
      data: {
        actionId: null,
        intent: "debt_payment",
        status: "NeedsClarification",
        riskLevel: "None",
        requiresConfirmation: false,
        summary: "What amount did the customer pay?",
        details: {},
      },
    });

    renderWithProviders(
      <AiQuickRecordBar />,
      "/customers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );
    const input = screen.getByPlaceholderText(/anh Nam vừa trả 2 triệu/i);
    fireEvent.change(input, { target: { value: "anh ấy vừa trả tiền" } });
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra/i }));

    await waitFor(() => expect(aiAssistantService.proposeAction).toHaveBeenCalledWith(
      "anh ấy vừa trả tiền",
      {
        route: "/customers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        entity: "customer",
        entityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      },
    ));
  });

  it("answers read-only questions with grounded chat and route context", async () => {
    vi.mocked(aiAssistantService.chat).mockResolvedValueOnce({
      success: true,
      data: {
        reply: "Hôm nay doanh thu là 540.000 VND.",
        provider: "Tenvora Local AI",
        model: "rule-grounded-engine",
        isFallback: true,
      },
    });

    renderWithProviders(<AiAssistantDialog open onOpenChange={vi.fn()} currency="VND" />);
    expect(screen.getByText("Tenvora")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hôm nay bán được bao nhiêu/i }));

    await waitFor(() => {
      expect(aiAssistantService.chat).toHaveBeenCalledWith(
        "Hôm nay bán được bao nhiêu?",
        { route: "/dashboard" },
      );
      expect(screen.getByText(/doanh thu là 540.000 VND/i)).toBeInTheDocument();
    });
  });

  it("accepts a natural-language yes for the current server-owned proposal", async () => {
    const actionId = "33333333-3333-3333-3333-333333333333";
    vi.mocked(aiAssistantService.proposeAction).mockResolvedValueOnce({
      success: true,
      data: {
        actionId,
        intent: "expense",
        status: "PendingConfirmation",
        riskLevel: "Financial",
        requiresConfirmation: true,
        summary: "Record 500,000 VND for transport?",
        details: { Amount: "500,000 VND", Category: "Transport" },
      },
    });
    vi.mocked(aiAssistantService.confirmAction).mockResolvedValueOnce({
      success: true,
      data: { actionId, status: "Executed", message: "Expense recorded." },
    });

    renderWithProviders(<AiAssistantDialog open onOpenChange={vi.fn()} currency="VND" />);
    const input = screen.getByPlaceholderText(/Hỏi hoặc yêu cầu Tenvora/i);
    fireEvent.change(input, { target: { value: "Ghi 500k tiền vận chuyển" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(screen.getByText(/Record 500,000 VND/i)).toBeInTheDocument());

    fireEvent.change(input, { target: { value: "yes" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(aiAssistantService.confirmAction).toHaveBeenCalledWith(actionId, true);
      expect(screen.getByText("Expense recorded.")).toBeInTheDocument();
    });
  });
});
