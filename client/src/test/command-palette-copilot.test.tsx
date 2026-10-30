import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CommandPalette } from "@/components/business/CommandPalette";
import { AiChatDrawer } from "@/components/assistant/AiChatDrawer";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { searchService, OmniSearchResult } from "@/services/searchService";
import { contextFromPath, getContextualPrompts } from "@/components/assistant/assistantContext";
import { aiAssistantService } from "@/services/aiService";

vi.mock("@/services/searchService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/searchService")>();
  return {
    ...actual,
    searchService: {
      ...actual.searchService,
      search: vi.fn(),
    },
  };
});

vi.mock("@/services/aiService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/aiService")>();
  return {
    ...actual,
    aiAssistantService: {
      ...actual.aiAssistantService,
      getConversations: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getConversation: vi.fn().mockResolvedValue({
        success: true,
        data: { id: "conv-1", messages: [] },
      }),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        data: {
          conversationId: "conv-1",
          messageId: "msg-1",
          reply: "I found 3 products.",
          toolCalls: [],
        },
      }),
      agentChat: vi.fn().mockResolvedValue({
        success: true,
        data: {
          conversationId: "conv-1",
          messageId: "msg-1",
          reply: "I found 3 products.",
          toolCalls: [],
        },
      }),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      tenantId: "t-1",
      email: "owner@tenvora.com",
      companyName: "Tenvora Coffee Roasters",
      preferredCurrency: "VND",
      role: "TenantAdmin",
      fullName: "Shop Owner",
    },
    logout: vi.fn(),
  }),
}));

const mockSearchResult: OmniSearchResult = {
  query: "coffee",
  customers: [
    {
      id: "cust-1",
      name: "Nguyen Van An",
      phone: "0901234567",
      totalDebt: 1500000,
    },
  ],
  products: [
    {
      id: "prod-1",
      name: "Arabica Premium 1kg",
      sku: "COF-ARA",
      sellingPrice: 280000,
      stockQuantity: 45,
      unit: "kg",
      trackInventory: true,
    },
    {
      id: "prod-2",
      name: "Robusta Dark Roast 1kg",
      sku: "COF-ROB",
      sellingPrice: 190000,
      stockQuantity: 0,
      unit: "kg",
      trackInventory: true,
    },
  ],
  sales: [
    {
      id: "sale-1",
      invoiceNumber: "INV-2026-001",
      customerName: "Nguyen Van An",
      totalAmount: 560000,
      paidAmount: 560000,
      status: "Posted",
      soldAt: new Date().toISOString(),
    },
  ],
  purchases: [
    {
      id: "po-1",
      purchaseNumber: "PO-2026-901",
      supplierName: "Da Lat Highlands Farm",
      totalAmount: 8500000,
      paidAmount: 4000000,
      status: "Posted",
      purchasedAt: new Date().toISOString(),
    },
  ],
};

function renderWithProviders(ui: React.ReactElement, initialRoute = "/dashboard") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLanguage="en">
        <MemoryRouter initialEntries={[initialRoute]}>
          {ui}
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("Phase 4: Everywhere Access (Command Bar & AI Copilot)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Context and Prompts Extraction", () => {
    it("extracts customer entity context and generates customer-specific prompts", () => {
      const customerId = "11111111-2222-3333-4444-555555555555";
      const ctx = contextFromPath(`/customers/${customerId}`);
      expect(ctx.entity).toBe("customer");
      expect(ctx.entityId).toBe(customerId);

      const tMock = (_k: string, _v?: any, fallback?: string) => fallback ?? _k;
      const prompts = getContextualPrompts(ctx, true, tMock);
      expect(prompts.length).toBeGreaterThanOrEqual(2);
      expect(prompts.some((p) => p.prompt.includes("Nhắc nợ") || p.prompt.includes("Remind"))).toBe(true);
    });

    it("extracts products route context and generates stock-related prompts", () => {
      const ctx = contextFromPath("/products");
      expect(ctx.route).toBe("/products");

      const tMock = (_k: string, _v?: any, fallback?: string) => fallback ?? _k;
      const prompts = getContextualPrompts(ctx, false, tMock);
      expect(prompts.some((p) => p.prompt.includes("low on stock"))).toBe(true);
      expect(prompts.some((p) => p.prompt.includes("out of stock"))).toBe(true);
    });

    it("returns default dashboard prompts for general pages", () => {
      const ctx = contextFromPath("/dashboard");
      const tMock = (_k: string, _v?: any, fallback?: string) => fallback ?? _k;
      const prompts = getContextualPrompts(ctx, true, tMock);
      expect(prompts.some((p) => p.prompt.includes("bán được bao nhiêu") || p.prompt.includes("sell"))).toBe(true);
      expect(prompts.some((p) => p.prompt.includes("quá 30 ngày") || p.prompt.includes("30 days"))).toBe(true);
    });
  });

  describe("CommandPalette Component", () => {
    it("renders search input, quick actions, and navigation options when query is empty", () => {
      renderWithProviders(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          onOpenAi={vi.fn()}
        />
      );

      expect(screen.getByPlaceholderText(/search products, customers, sales/i)).toBeInTheDocument();
      // Quick actions
      expect(screen.getByText(/new sale/i)).toBeInTheDocument();
      expect(screen.getByText(/scan supplier invoice/i)).toBeInTheDocument();
      expect(screen.getByText(/scan expense receipt/i)).toBeInTheDocument();
      expect(screen.getByText(/pay supplier bill/i)).toBeInTheDocument();
      expect(screen.getByText(/ask ai copilot/i)).toBeInTheDocument();

      // Navigation
      expect(screen.getByText(/review queue/i)).toBeInTheDocument();
      expect(screen.getAllByText(/sales/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/products/i).length).toBeGreaterThan(0);
    });

    it("executes search when typing and renders customers, products, sales, and purchases", async () => {
      vi.mocked(searchService.search).mockResolvedValueOnce({
        success: true,
        data: mockSearchResult,
      });

      renderWithProviders(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          onOpenAi={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/search products, customers, sales/i);
      fireEvent.change(input, { target: { value: "coffee" } });

      await waitFor(() => {
        expect(searchService.search).toHaveBeenCalledWith("coffee", 6);
      }, { timeout: 3000 });

      // Customer section
      await waitFor(() => {
        expect(screen.getAllByText("Nguyen Van An").length).toBeGreaterThan(0);
      }, { timeout: 3000 });
      expect(screen.getByText(/0901234567/)).toBeInTheDocument();
      expect(screen.getByText(/1,500,000/)).toBeInTheDocument();

      // Product section
      expect(screen.getByText("Arabica Premium 1kg")).toBeInTheDocument();
      expect(screen.getByText(/Stock: 45 kg/i)).toBeInTheDocument();
      expect(screen.getByText("Robusta Dark Roast 1kg")).toBeInTheDocument();
      expect(screen.getByText(/Out of stock/i)).toBeInTheDocument();

      // Sales & Purchase
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
      expect(screen.getByText("PO-2026-901")).toBeInTheDocument();
    });

    it("displays friendly empty state with AI prompt when no matches found", async () => {
      vi.mocked(searchService.search).mockResolvedValueOnce({
        success: true,
        data: {
          query: "unknown-sku",
          customers: [],
          products: [],
          sales: [],
          purchases: [],
        },
      });

      const onOpenAiMock = vi.fn();
      renderWithProviders(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          onOpenAi={onOpenAiMock}
        />
      );

      const input = screen.getByPlaceholderText(/search products, customers, sales/i);
      fireEvent.change(input, { target: { value: "unknown-sku" } });

      await waitFor(() => {
        expect(screen.getByText(/no records found matching/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const askBtn = screen.getByText(/ask ai copilot about this/i);
      fireEvent.click(askBtn);
      expect(onOpenAiMock).toHaveBeenCalledWith("unknown-sku");
    });
  });

  describe("AiChatDrawer Copilot Enhancements", () => {
    it("renders active context banner and contextual prompt chips", async () => {
      renderWithProviders(
        <AiChatDrawer
          open={true}
          onOpenChange={vi.fn()}
          currency="VND"
          canMutate={true}
        />,
        "/products"
      );

      // Context banner
      expect(screen.getByText(/products & stock catalog/i)).toBeInTheDocument();

      // Contextual prompt chips
      expect(screen.getByText(/restock low items/i)).toBeInTheDocument();
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
      expect(screen.getByText(/fast movers/i)).toBeInTheDocument();

      // Shortcut hint
      expect(screen.getByText(/Ctrl \+ J/i)).toBeInTheDocument();
    });

    it("sends prompt directly when clicking contextual prompt chip", async () => {
      renderWithProviders(
        <AiChatDrawer
          open={true}
          onOpenChange={vi.fn()}
          currency="VND"
          canMutate={true}
        />,
        "/products"
      );

      const chip = screen.getByText(/restock low items/i);
      fireEvent.click(chip);

      await waitFor(() => {
        expect(aiAssistantService.agentChat).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(/low on stock|sắp hết kho/i),
          })
        );
      });
    });
  });
});
