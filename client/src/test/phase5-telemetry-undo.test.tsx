import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ActionableNotifications } from "@/components/business/ActionableNotifications";
import { showToastWithUndo } from "@/lib/undoAction";
import { aiAssistantService } from "@/services/aiService";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/services/aiService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/aiService")>();
  return {
    ...actual,
    aiAssistantService: {
      ...actual.aiAssistantService,
      undoAction: vi.fn(),
    },
  };
});

vi.mock("@/services/businessService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/businessService")>();
  return {
    ...actual,
    businessService: {
      ...actual.businessService,
      getAttentionItems: vi.fn(),
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>{ui}</LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Phase 5: Undo Toast, Actionable Notifications & Telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("showToastWithUndo triggers sonner toast with an undo action button", async () => {
    const mockT = vi.fn((key: string, _p?: any, fallback?: string) => fallback || key);
    const onUndoSuccess = vi.fn();

    vi.mocked(aiAssistantService.undoAction).mockResolvedValueOnce({
      success: true,
      data: {
        actionId: "act-undo-123",
        status: "Undone",
        message: "Action undone and reverted.",
      },
    });

    showToastWithUndo({
      message: "Purchase recorded successfully",
      actionId: "act-undo-123",
      onUndoSuccess,
      t: mockT,
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Purchase recorded successfully",
      expect.objectContaining({
        action: expect.objectContaining({
          label: "Undo",
        }),
      })
    );

    // Simulate clicking the Undo button in toast
    const toastCall = vi.mocked(toast.success).mock.calls[0];
    const actionConfig = (toastCall[1] as any).action;
    await actionConfig.onClick();

    expect(aiAssistantService.undoAction).toHaveBeenCalledWith("act-undo-123");
    expect(onUndoSuccess).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Action undone and reverted.");
  });

  it("ActionableNotifications displays active urgent badge count and renders notifications modal", async () => {
    vi.mocked(businessService.getAttentionItems).mockResolvedValueOnce([
      {
        id: "stock-1",
        type: "out_of_stock",
        severity: "urgent",
        title: "5 items out of stock",
        subtitle: "Items reached 0 inventory",
        count: 5,
        actionLabel: "Restock",
        actionRoute: "/products",
      },
      {
        id: "bill-1",
        type: "supplier_bill_due",
        severity: "warn",
        title: "Supplier bill due in 2 days",
        subtitle: "Invoice PO-202",
        count: 1,
        actionLabel: "Pay",
        actionKey: "pay_supplier",
        metadata: { supplierId: "sup-1" },
      },
    ]);

    const onPaySupplier = vi.fn();

    renderWithProviders(<ActionableNotifications onPaySupplier={onPaySupplier} />);

    // Check badge count
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    // Open notifications dialog
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText("5 items out of stock")).toBeInTheDocument();
    expect(screen.getByText("Supplier bill due in 2 days")).toBeInTheDocument();

    // Click pay action
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));
    expect(onPaySupplier).toHaveBeenCalledWith({ supplierId: "sup-1" });
  });

  it("ActionableNotifications respects user-configured alert toggles", async () => {
    vi.mocked(businessService.getAttentionItems).mockResolvedValueOnce([
      {
        id: "stock-1",
        type: "out_of_stock",
        severity: "urgent",
        title: "5 items out of stock",
        subtitle: "Items reached 0 inventory",
        count: 5,
        actionLabel: "Restock",
        actionRoute: "/products",
      },
    ]);

    // Pre-configure preferences to disable stockouts
    localStorage.setItem(
      "tenvora_notification_prefs",
      JSON.stringify({
        notifyStockouts: false,
        notifyBillsDue: true,
        notifyPendingDrafts: true,
        notifyCustomerOverdue: true,
      })
    );

    renderWithProviders(<ActionableNotifications />);

    // Since stockouts are disabled, count should be 0 and no badge displayed
    await waitFor(() => {
      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });

    // Open dialog -> shows all caught up
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
  });
});
