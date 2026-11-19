import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiChatDrawer } from "@/components/assistant/AiChatDrawer";
import { DashboardLayout } from "@/components/DashboardLayout";
import AgentChatPage from "@/pages/business/AgentChatPage";
import MobileLandingPage from "@/pages/MobileLandingPage";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      email: "owner@example.test",
      role: "TenantAdmin",
      companyName: "Example Shop",
      onboardingCompleted: true,
    },
    logout: vi.fn(),
  }),
  useOptionalAuth: () => null,
}));

vi.mock("@/services/aiService", () => ({
  aiAssistantService: {
    getConversations: vi.fn(async () => ({
      success: true,
      data: [
        {
          id: "conv-1",
          title: "Daily summary",
          updatedAt: new Date().toISOString(),
        },
      ],
    })),
    getConversation: vi.fn(async () => ({
      success: true,
      data: { id: "conv-1", title: "Daily summary", messages: [] },
    })),
    chat: vi.fn(async () => ({ success: false })),
    deleteConversation: vi.fn(async () => ({ success: true })),
  },
  applyActionExecutionToProposal: vi.fn((p) => p),
}));

vi.mock("@/services/captureService", () => ({
  captureService: {
    getReviewQueue: vi.fn(async () => ({ success: true, data: [] })),
  },
}));

vi.mock("@/services/businessService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/businessService")>();
  return {
    ...actual,
    businessService: {
      ...actual.businessService,
      getDashboard: vi.fn(async () => ({ success: false })),
      getProducts: vi.fn(async () => ({ success: true, data: { items: [] } })),
      getCustomers: vi.fn(async () => ({ success: true, data: { items: [] } })),
      getSuppliers: vi.fn(async () => ({ success: true, data: { items: [] } })),
      getNotifications: vi.fn(async () => ({ success: true, data: [] })),
    },
  };
});

function setViewportMatch(desktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === "(min-width: 768px)" ? desktop : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

describe("TEN-WEB-02: Dialog and mobile sidebar accessibility", () => {
  afterEach(() => {
    setViewportMatch(false);
    vi.clearAllMocks();
  });

  it("renders AiChatDrawer as an accessible modal dialog with labeled controls and Escape dismissal", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageProvider fixedLanguage="en">
            <AiChatDrawer open={true} onOpenChange={onOpenChange} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Tenvora Agent/i });
    expect(dialog).toBeInTheDocument();

    const historyBtn = screen.getByRole("button", { name: "Conversation history" });
    expect(historyBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open full page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByLabelText("Message Tenvora Agent")).toBeInTheDocument();

    // Wait for initial auto-load of conversations/active thread to finish before toggling history
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    });

    fireEvent.click(historyBtn);
    await waitFor(() => {
      expect(historyBtn).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: "Daily summary" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete conversation" })).toBeInTheDocument();
    });

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("manages mobile sidebar dialog semantics, inert state, skip link, and Escape close", () => {
    setViewportMatch(false);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageProvider defaultLanguage="en">
            <DashboardLayout>
              <p>Workspace body</p>
            </DashboardLayout>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");

    const sidebar = document.getElementById("workspace-sidebar") as HTMLElement;
    expect(sidebar).toHaveAttribute("aria-hidden", "true");
    expect(sidebar.inert).toBe(true);

    const openBtn = screen.getByRole("button", { name: "Open navigation" });
    expect(openBtn).toHaveAttribute("aria-expanded", "false");
    expect(openBtn).toHaveAttribute("aria-controls", "workspace-sidebar");

    fireEvent.click(openBtn);
    expect(openBtn).toHaveAttribute("aria-expanded", "true");
    expect(sidebar).toHaveAttribute("role", "dialog");
    expect(sidebar).toHaveAttribute("aria-modal", "true");
    expect(sidebar.inert).toBe(false);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(openBtn).toHaveAttribute("aria-expanded", "false");
    expect(sidebar.inert).toBe(true);
  });

  it("exposes a single main landmark on AgentChatPage and keeps MobileLandingPage sections inside main", () => {
    setViewportMatch(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { container: agentContainer } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageProvider defaultLanguage="en">
            <AgentChatPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(agentContainer.querySelectorAll("main")).toHaveLength(1);

    const { container: mobileContainer } = render(
      <MemoryRouter>
        <LanguageProvider fixedLanguage="en">
          <MobileLandingPage />
        </LanguageProvider>
      </MemoryRouter>,
    );
    const main = mobileContainer.querySelector("main");
    expect(main).toBeTruthy();
    const sectionsOutsideMain = Array.from(mobileContainer.querySelectorAll("section")).filter(
      (section) => !main?.contains(section),
    );
    expect(sectionsOutsideMain).toHaveLength(0);
  });
});
