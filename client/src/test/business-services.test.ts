import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/services/apiClient";
import { businessService } from "@/services/businessService";

vi.mock("@/services/apiClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe("Tenvora 2.0 business API contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("searches the generic customer endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });
    await businessService.getCustomers("nam");
    expect(apiClient.get).toHaveBeenCalledWith("/customers", { params: { search: "nam", status: "Active" } });
  });

  it("records a sale through an idempotent endpoint", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "sale-1" } } });
    const request = {
      customerId: "customer-1",
      items: [{ productId: "product-1", quantity: 15, unitPrice: 180_000 }],
      paymentAmount: 1_000_000,
      paymentMethod: "Cash",
    };
    await businessService.createSale(request);
    expect(apiClient.post).toHaveBeenCalledWith("/sales", request, {
      headers: { "Idempotency-Key": expect.any(String) },
    });
  });

  it("deletes a product through the product endpoint", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { data: { productId: "product-1", deletedPermanently: true, archived: false } } });

    const result = await businessService.deleteProduct("product-1");

    expect(apiClient.delete).toHaveBeenCalledWith("/products/product-1");
    expect(result.deletedPermanently).toBe(true);
  });

  it("records customer account lump-sum payment with idempotency key", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { totalAllocated: 500_000 } } });
    const request = { amount: 500_000, method: "Bank transfer", reference: "REF123" };
    await businessService.recordCustomerAccountPayment("customer-1", request);
    expect(apiClient.post).toHaveBeenCalledWith("/customers/customer-1/payments", request, {
      headers: { "Idempotency-Key": expect.any(String) },
    });
  });

  it("records later payments against a sale rather than overwriting a balance", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "sale-1" } } });
    const request = { amount: 500_000, method: "Bank transfer" };
    await businessService.recordPayment("sale-1", request);
    expect(apiClient.post).toHaveBeenCalledWith("/sales/sale-1/payments", request, {
      headers: { "Idempotency-Key": expect.any(String) },
    });
  });

  it("records purchases and supplier payments through idempotent endpoints", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "purchase-1" } } });
    const purchase = { supplierId: "supplier-1", items: [{ description: "Stock", unit: "kg", quantity: 10, unitCost: 80 }], paymentAmount: 100, paymentMethod: "Cash" };
    await businessService.createPurchase(purchase);
    await businessService.recordPurchasePayment("purchase-1", { amount: 50, method: "Cash" });
    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/purchases", purchase, { headers: { "Idempotency-Key": expect.any(String) } });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/purchases/purchase-1/payments", { amount: 50, method: "Cash" }, { headers: { "Idempotency-Key": expect.any(String) } });
  });

  it("uses the business expense and dashboard endpoints with update and delete", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "expense-1" } } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: { id: "expense-1" } } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {} } });

    const expense = { category: "Transportation", amount: 25, description: "Delivery" };
    await businessService.createBusinessExpense(expense);
    await businessService.updateBusinessExpense("expense-1", expense);
    await businessService.deleteBusinessExpense("expense-1");
    await businessService.getDashboard();
    await businessService.getDashboard("month");

    expect(apiClient.post).toHaveBeenCalledWith("/business-expenses", expense, { headers: { "Idempotency-Key": expect.any(String) } });
    expect(apiClient.put).toHaveBeenCalledWith("/business-expenses/expense-1", expense);
    expect(apiClient.delete).toHaveBeenCalledWith("/business-expenses/expense-1");
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/business-dashboard");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/business-dashboard", {
      params: { period: "month", from: undefined, to: undefined },
    });
  });
});
