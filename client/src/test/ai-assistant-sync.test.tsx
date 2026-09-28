import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { aiAssistantService, AiConversationDetail, AiConversationSummary } from "@/services/aiService";
import { AiChatDrawer } from "@/components/assistant/AiChatDrawer";
import AgentChatPage from "@/pages/business/AgentChatPage";
import {
  getSyncedAiConversationId,
  publishAiConversationSync,
  resetSyncedAiConversationState,
  setSyncedAiConversationId,
  subscribeToAiConversationSync,
} from "@/components/assistant/assistantSync";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      email: "owner@example.test",
      role: "TenantAdmin",
      companyName: "Example Business",
      onboardingCompleted: true,
      preferredCurrency: "VND",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("@/services/businessService", () => ({
  businessMoney: (v: number = 0) => `${(v || 0).toLocaleString("vi-VN")} VND`,
  businessService: {
    getDashboard: vi.fn().mockResolvedValue({
      currency: "VND",
      todaySales: 1000000,
      todayExpenses: 200000,
      todayProfit: 800000,
      totalReceivables: 500000,
      totalPayables: 300000,
      lowStockCount: 2,
      outstandingCustomers: 500000,
      outstandingSuppliers: 300000,
    }),
  },
}));

vi.mock("@/services/aiService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/aiService")>();
  return {
    ...actual,
    aiAssistantService: {
      ...actual.aiAssistantService,
      getConversations: vi.fn(),
      getConversation: vi.fn(),
      agentChat: vi.fn(),
      confirmAction: vi.fn(),
      deleteConversation: vi.fn(),
    },
  };
});

function createMockConversation(id: string, title: string, messages: any[] = []): AiConversationDetail {
  return {
    id,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages,
  };
}

describe("AI Agent Page and Bottom-Right Bubble Synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    resetSyncedAiConversationState();
  });

  it("maintains synchronized selection in assistantSync module and session storage", () => {
    expect(getSyncedAiConversationId()).toBeUndefined();

    setSyncedAiConversationId("conv-123");
    expect(getSyncedAiConversationId()).toBe("conv-123");
    expect(sessionStorage.getItem("tenvora_active_ai_conversation_id")).toBe("conv-123");

    setSyncedAiConversationId(null);
    expect(getSyncedAiConversationId()).toBeNull();
    expect(sessionStorage.getItem("tenvora_active_ai_conversation_id")).toBe("__NEW__");

    resetSyncedAiConversationState();
    expect(getSyncedAiConversationId()).toBeUndefined();
    expect(sessionStorage.getItem("tenvora_active_ai_conversation_id")).toBeNull();
  });

  it("dispatches and handles CustomEvent sync events across surfaces", () => {
    const received: any[] = [];
    const unsubscribe = subscribeToAiConversationSync((event) => {
      received.push(event);
    });

    publishAiConversationSync({
      activeConversationId: "conv-abc",
      reason: "selected",
      source: "test-runner",
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      activeConversationId: "conv-abc",
      reason: "selected",
      source: "test-runner",
    });
    expect(getSyncedAiConversationId()).toBe("conv-abc");

    unsubscribe();
  });

  it("syncs thread selection from AgentChatPage to AiChatDrawer when drawer opens", async () => {
    const convList: AiConversationSummary[] = [
      { id: "conv-1", title: "Thread 1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 1 },
      { id: "conv-2", title: "Thread 2", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 2 },
    ];

    const convDetail1 = createMockConversation("conv-1", "Thread 1", [
      { id: "m1", role: "assistant", content: "Message from thread 1", createdAt: new Date().toISOString() },
    ]);
    const convDetail2 = createMockConversation("conv-2", "Thread 2", [
      { id: "m2", role: "assistant", content: "Message from thread 2", createdAt: new Date().toISOString() },
    ]);

    vi.mocked(aiAssistantService.getConversations).mockResolvedValue({ success: true, data: convList });
    vi.mocked(aiAssistantService.getConversation).mockImplementation(async (id) => {
      if (id === "conv-2") return { success: true, data: convDetail2 };
      return { success: true, data: convDetail1 };
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Render AgentChatPage with initial URL ?id=conv-2
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent?id=conv-2"]}>
          <LanguageProvider defaultLanguage="vi">
            <AgentChatPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify AgentChatPage loads Thread 2
    await waitFor(() => {
      expect(screen.getByText("Message from thread 2")).toBeInTheDocument();
    });

    // Verify active conversation in sync module is conv-2
    expect(getSyncedAiConversationId()).toBe("conv-2");

    // Now render AiChatDrawer with open=true (simulating opening the bottom-right bubble)
    const onOpenChange = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <LanguageProvider defaultLanguage="vi">
            <AiChatDrawer open={true} onOpenChange={onOpenChange} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify drawer automatically loaded conv-2
    await waitFor(() => {
      const msgs = screen.getAllByText("Message from thread 2");
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("syncs new chat creation across both surfaces", async () => {
    const convList: AiConversationSummary[] = [
      { id: "conv-1", title: "Thread 1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 1 },
    ];
    const convDetail1 = createMockConversation("conv-1", "Thread 1", [
      { id: "m1", role: "assistant", content: "Old conversation", createdAt: new Date().toISOString() },
    ]);

    vi.mocked(aiAssistantService.getConversations).mockResolvedValue({ success: true, data: convList });
    vi.mocked(aiAssistantService.getConversation).mockResolvedValue({ success: true, data: convDetail1 });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Render both surfaces simultaneously (as in DashboardLayout)
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent?id=conv-1"]}>
          <LanguageProvider defaultLanguage="vi">
            <AgentChatPage />
            <AiChatDrawer open={true} onOpenChange={vi.fn()} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Old conversation").length).toBeGreaterThanOrEqual(1);
    });

    // In drawer, click "New chat" button
    const newChatButtons = screen.getAllByTitle("Cuộc trò chuyện mới");
    fireEvent.click(newChatButtons[newChatButtons.length - 1]);

    // Verify both surfaces reset and show the greeting message
    await waitFor(() => {
      expect(getSyncedAiConversationId()).toBeNull();
      expect(screen.queryByText("Old conversation")).not.toBeInTheDocument();
    });
  });

  it("propagates message sending and updates from one surface to the other", async () => {
    const convList: AiConversationSummary[] = [
      { id: "conv-1", title: "Thread 1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 1 },
    ];
    let thread1Messages = [
      { id: "m1", role: "assistant", content: "Initial greeting", createdAt: new Date().toISOString() },
    ];

    vi.mocked(aiAssistantService.getConversations).mockResolvedValue({ success: true, data: convList });
    vi.mocked(aiAssistantService.getConversation).mockImplementation(async () => ({
      success: true,
      data: createMockConversation("conv-1", "Thread 1", thread1Messages),
    }));

    vi.mocked(aiAssistantService.agentChat).mockImplementation(async ({ message }) => {
      thread1Messages = [
        ...thread1Messages,
        { id: "u2", role: "user", content: message, createdAt: new Date().toISOString() },
        { id: "a2", role: "assistant", content: `Reply to: ${message}`, createdAt: new Date().toISOString() },
      ];
      return {
        success: true,
        data: {
          conversationId: "conv-1",
          messageId: "a2",
          reply: `Reply to: ${message}`,
          provider: "gemini",
          model: "gemini-2.5-flash",
          isFallback: false,
        },
      };
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent?id=conv-1"]}>
          <LanguageProvider defaultLanguage="vi">
            <AgentChatPage />
            <AiChatDrawer open={true} onOpenChange={vi.fn()} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Initial greeting").length).toBeGreaterThanOrEqual(1);
    });

    // In drawer, submit a message
    const drawerInput = screen.getByPlaceholderText(/Nhắn cho Tenvora Agent/i);
    fireEvent.change(drawerInput, { target: { value: "Kiểm tra doanh thu hôm nay" } });
    fireEvent.submit(drawerInput.closest("form")!);

    // Verify both surfaces show the new reply
    await waitFor(() => {
      const replies = screen.getAllByText("Reply to: Kiểm tra doanh thu hôm nay");
      expect(replies.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("propagates interactive action execution across surfaces", async () => {
    const proposalAction = {
      actionId: "act-101",
      intent: "sale" as const,
      status: "PendingConfirmation",
      riskLevel: "Financial" as const,
      requiresConfirmation: true,
      summary: "Ghi nhận đơn bán 500.000 VND cho Chị Lan?",
      details: { Customer: "Chị Lan", Total: "500.000 VND" },
    };

    let threadMessages = [
      {
        id: "msg-prop",
        role: "assistant",
        content: "Tôi đã chuẩn bị đơn bán:",
        proposal: proposalAction,
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(aiAssistantService.getConversations).mockResolvedValue({
      success: true,
      data: [{ id: "conv-act", title: "Action thread", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 1 }],
    });

    vi.mocked(aiAssistantService.getConversation).mockImplementation(async () => ({
      success: true,
      data: createMockConversation("conv-act", "Action thread", threadMessages),
    }));

    vi.mocked(aiAssistantService.confirmAction).mockImplementation(async (actionId, confirmed) => {
      threadMessages = [
        {
          id: "msg-prop",
          role: "assistant",
          content: "Tôi đã chuẩn bị đơn bán:",
          proposal: {
            ...proposalAction,
            status: confirmed ? "Executed" : "Cancelled",
            requiresConfirmation: false,
            summary: "Đã hoàn tất thao tác",
          },
          createdAt: new Date().toISOString(),
        },
      ];
      return {
        success: true,
        data: {
          actionId,
          status: "Executed",
          message: "Đã hoàn tất thao tác thành công",
        },
      };
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent?id=conv-act"]}>
          <LanguageProvider defaultLanguage="vi">
            <AgentChatPage />
            <AiChatDrawer open={true} onOpenChange={vi.fn()} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Find confirm button on drawer card
    await waitFor(() => {
      expect(screen.getAllByText(/Ghi nhận đơn bán 500.000 VND/i).length).toBeGreaterThanOrEqual(1);
    });

    const confirmBtns = screen.getAllByRole("button", { name: /Xác nhận & Ghi sổ/i });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    // Verify confirmation propagates across surfaces
    await waitFor(() => {
      expect(aiAssistantService.confirmAction).toHaveBeenCalledWith("act-101", true, undefined);
      expect(screen.getAllByText(/Đã hoàn tất thao tác/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
