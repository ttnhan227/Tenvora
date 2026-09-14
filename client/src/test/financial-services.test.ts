import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/services/apiClient";
import { invoiceService } from "@/services/invoiceService";
import { expenseService } from "@/services/expenseService";
import { transactionService } from "@/services/transactionService";

vi.mock("@/services/apiClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe("authoritative financial API contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a stable idempotency key when recording an invoice payment", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "invoice" } } });
    await invoiceService.payInvoice("invoice", { amount: 125, autoTaxSetAside: false, reference: "BANK-9" }, "deposit-9");
    expect(apiClient.post).toHaveBeenCalledWith("/invoices/invoice/pay",
      { amount: 125, autoTaxSetAside: false, reference: "BANK-9" },
      { headers: { "Idempotency-Key": "deposit-9" } });
  });

  it("requires an idempotency key for expense creation", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "expense" } } });
    const request = { accountId: "account", merchant: "Figma", category: "Software", amount: 20,
      currency: "USD", expenseDate: "2026-09-14" };
    await expenseService.create(request, "card-charge-1");
    expect(apiClient.post).toHaveBeenCalledWith("/expenses", request,
      { headers: { "Idempotency-Key": "card-charge-1" } });
  });

  it("combines server-side transaction filters and pagination", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { items: [], page: 2, pageSize: 25, totalCount: 0, totalPages: 0 } } });
    await transactionService.list({ search: "cedar", type: "InvoicePayment", sort: "amount_desc", page: 2, pageSize: 25 });
    expect(apiClient.get).toHaveBeenCalledWith("/transactions", { params: {
      search: "cedar", type: "InvoicePayment", sort: "amount_desc", page: 2, pageSize: 25,
    } });
  });
});
