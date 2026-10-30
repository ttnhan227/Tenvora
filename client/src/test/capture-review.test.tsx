import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CaptureSheet } from "@/components/business/CaptureSheet";
import { ReviewQueueModal } from "@/components/business/ReviewQueueModal";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { captureService, CaptureResult } from "@/services/captureService";
import { aiAssistantService } from "@/services/aiService";

vi.mock("@/services/captureService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/captureService")>();
  return {
    ...actual,
    captureService: {
      ...actual.captureService,
      analyzeDocument: vi.fn(),
      uploadAndAnalyze: vi.fn(),
      getReviewQueue: vi.fn(),
      bulkApprove: vi.fn(),
      rejectDraft: vi.fn(),
      createRule: vi.fn(),
    },
  };
});

vi.mock("@/services/aiService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/aiService")>();
  return {
    ...actual,
    aiAssistantService: {
      ...actual.aiAssistantService,
      confirmAction: vi.fn(),
    },
  };
});

const sampleCaptureResult: CaptureResult = {
  actionId: "act-test-123",
  intent: "purchase",
  status: "PendingConfirmation",
  summary: "Create purchase from ABC Supplies: 2 items, total 5,000,000 VND",
  duplicate: {
    isDuplicate: true,
    duplicateReason: "Matches PO-1024 (same supplier, amount, and date)",
    recordType: "Purchase",
    recordId: "po-1024",
    recordNumber: "PO-1024",
    recordAmount: 5000000,
  },
  draft: {
    intent: "purchase",
    vendor: "ABC Supplies Co.",
    supplierId: "sup-1",
    date: "2026-10-30",
    dueDate: "2026-11-15",
    currency: "VND",
    totalAmount: 5000000,
    taxAmount: 500000,
    paidAmount: 2500000,
    paymentMethod: "BankTransfer",
    notes: "Scanned from invoice #INV-889",
    invoiceImageUrl: "https://tenvora-uploads.example.com/inv-889.jpg",
    fileHash: "hash1234567890abcdef",
    lineItems: [
      {
        description: "Arabica Coffee Beans 1kg",
        unit: "kg",
        quantity: 10,
        unitCost: 250000,
        lineTotal: 2500000,
        matchedProductId: "prod-1",
        matchedProductName: "Arabica Coffee Beans",
        confidence: 0.95,
        source: "Catalog match",
        why: "Matched catalog product by SKU and name",
      },
      {
        description: "Paper Coffee Filters 100pk",
        unit: "pack",
        quantity: 20,
        unitCost: 100000,
        lineTotal: 2000000,
        matchedProductId: null,
        confidence: 0.65,
        source: "OCR text",
        why: "Uncertain OCR match, confidence < 80%",
      },
    ],
    provenance: {
      overallConfidence: 0.85,
      sourceType: "Image OCR",
      fields: {
        vendor: { value: "ABC Supplies Co.", confidence: 0.98, source: "Invoice Header", why: "Found tax code match" },
        totalAmount: { value: 5000000, confidence: 0.95, source: "Total line", why: "Exact sum match" },
      },
      explanations: {
        vendor: "Matched supplier ABC Supplies Co.",
      },
    },
    validationErrors: [],
    validationWarnings: ["Line item 'Paper Coffee Filters' has low confidence (65%)."],
  },
};

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider defaultLanguage="en">{ui}</LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Phase 3: Capture & Review Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CaptureSheet component", () => {
    it("renders input mode with file upload dropzone and quick-add textarea", () => {
      renderWithProviders(
        <CaptureSheet open={true} onOpenChange={vi.fn()} />
      );

      // Verify title and input elements
      expect(screen.getByText(/Scan Invoice \/ Receipt/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload invoice or receipt/i)).toBeInTheDocument();
      expect(screen.getByText(/Take Photo with Camera/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste tabular invoice text/i)).toBeInTheDocument();
    });

    it("submits natural language text input to analyze and stages draft", async () => {
      vi.mocked(captureService.analyzeDocument).mockResolvedValue({
        success: true,
        data: sampleCaptureResult,
      } as any);

      renderWithProviders(
        <CaptureSheet open={true} onOpenChange={vi.fn()} />
      );

      const textarea = screen.getByPlaceholderText(/Paste tabular invoice text/i);
      fireEvent.change(textarea, { target: { value: "bought 20 boxes Arabica from ABC Supplies 5M, paid half" } });

      const analyzeBtn = screen.getByRole("button", { name: /Extract with AI/i });
      fireEvent.click(analyzeBtn);

      await waitFor(() => {
        expect(captureService.analyzeDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            rawText: "bought 20 boxes Arabica from ABC Supplies 5M, paid half",
          })
        );
      });

      // After analysis, review pane should be rendered
      await waitFor(() => {
        expect(screen.getByText(/Review Extracted Record/i)).toBeInTheDocument();
      });
    });

    it("renders review mode with provenance, duplicate warning, and line items", () => {
      renderWithProviders(
        <CaptureSheet
          open={true}
          onOpenChange={vi.fn()}
          initialResult={sampleCaptureResult}
        />
      );

      // Review header
      expect(screen.getByText(/Review Extracted Record/i)).toBeInTheDocument();

      // Duplicate warning banner
      expect(screen.getByText(/Possible Duplicate Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Matches PO-1024/i)).toBeInTheDocument();

      // Vendor input prefilled
      const vendorInput = screen.getByDisplayValue("ABC Supplies Co.");
      expect(vendorInput).toBeInTheDocument();

      // Items rendered in inputs
      expect(screen.getByDisplayValue("Arabica Coffee Beans 1kg")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Paper Coffee Filters 100pk")).toBeInTheDocument();
      expect(screen.getByText("Matched catalog product by SKU and name")).toBeInTheDocument();

      // Confidence badge is rendered
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });

    it("confirms draft via two-phase commit with overrides and closes sheet", async () => {
      const handleConfirmed = vi.fn();
      const handleOpenChange = vi.fn();

      vi.mocked(aiAssistantService.confirmAction).mockResolvedValue({
        success: true,
        data: { message: "Purchase successfully created" },
      } as any);

      renderWithProviders(
        <CaptureSheet
          open={true}
          onOpenChange={handleOpenChange}
          initialResult={sampleCaptureResult}
          onConfirmed={handleConfirmed}
        />
      );

      const confirmButton = screen.getByRole("button", { name: /Confirm & Save/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(aiAssistantService.confirmAction).toHaveBeenCalledWith(
          "act-test-123",
          true,
          expect.objectContaining({
            supplierName: "ABC Supplies Co.",
            amount: 5000000,
            paidAmount: 2500000,
          })
        );
      });

      await waitFor(() => {
        expect(handleConfirmed).toHaveBeenCalledWith(sampleCaptureResult);
        expect(handleOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("ReviewQueueModal component", () => {
    it("fetches and renders pending drafts in the review queue", async () => {
      renderWithProviders(
        <ReviewQueueModal
          open={true}
          onOpenChange={vi.fn()}
          queue={[sampleCaptureResult]}
          isLoading={false}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText("ABC Supplies Co.")).toBeInTheDocument();
      expect(screen.getByText(/2 items/i)).toBeInTheDocument();
    });

    it("bulk approves selected drafts", async () => {
      const handleRefresh = vi.fn();
      vi.mocked(captureService.bulkApprove).mockResolvedValue({
        success: true,
        data: {
          totalProcessed: 1,
          approvedCount: 1,
          failedCount: 0,
          messages: [],
        },
      });

      renderWithProviders(
        <ReviewQueueModal
          open={true}
          onOpenChange={vi.fn()}
          queue={[sampleCaptureResult]}
          isLoading={false}
          onRefresh={handleRefresh}
        />
      );

      expect(screen.getByText("ABC Supplies Co.")).toBeInTheDocument();

      // Click select all
      const selectAllBtn = screen.getByText(/Select all/i);
      fireEvent.click(selectAllBtn);

      // Bulk approve button should become active
      const approveBtn = screen.getByRole("button", { name: /Approve Selected/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(captureService.bulkApprove).toHaveBeenCalledWith(["act-test-123"]);
      });

      await waitFor(() => {
        expect(handleRefresh).toHaveBeenCalled();
      });
    });

    it("rejects a draft from the queue", async () => {
      const handleRefresh = vi.fn();
      vi.mocked(captureService.rejectDraft).mockResolvedValue({
        success: true,
        data: { message: "Draft discarded" },
      } as any);

      renderWithProviders(
        <ReviewQueueModal
          open={true}
          onOpenChange={vi.fn()}
          queue={[sampleCaptureResult]}
          isLoading={false}
          onRefresh={handleRefresh}
        />
      );

      expect(screen.getByText("ABC Supplies Co.")).toBeInTheDocument();

      // Find discard button by aria-label
      const rejectBtn = screen.getByRole("button", { name: /Discard draft/i });
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(captureService.rejectDraft).toHaveBeenCalledWith("act-test-123");
      });

      await waitFor(() => {
        expect(handleRefresh).toHaveBeenCalled();
      });
    });
  });
});
