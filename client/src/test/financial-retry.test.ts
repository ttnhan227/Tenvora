import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/services/apiClient";
import { financialWrite } from "@/lib/financialWrite";
import { getApiErrorInfo } from "@/lib/apiErrors";

vi.mock("@/services/apiClient", () => ({ default: { post: vi.fn() } }));

describe("financial retry safety", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); localStorage.setItem("user", JSON.stringify({ id: "owner", tenantId: "workspace" })); });
  it("reuses the request ID after an uncertain failure, including a module reload", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("Network Error"));
    await expect(financialWrite("/sales/sale/payments", { amount: 10, method: "Cash" })).rejects.toMatchObject({ code: "write_uncertain" });
    const first = vi.mocked(apiClient.post).mock.calls[0][2]?.headers?.["Idempotency-Key"];
    vi.resetModules();
    const { financialWrite: restartedWrite } = await import("@/lib/financialWrite");
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "payment" } } });
    await restartedWrite("/sales/sale/payments", { method: "Cash", amount: 10 });
    expect(vi.mocked(apiClient.post).mock.calls[1][2]?.headers?.["Idempotency-Key"]).toBe(first);
    expect(localStorage.getItem("tenvora_pending_writes")).toBe("{}");
  });
  it("coalesces simultaneous submissions and does not retain successful IDs", async () => {
    let finish!: (value: { data: object }) => void;
    vi.mocked(apiClient.post).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const first = financialWrite("/sales", { amount: 10 });
    const second = financialWrite("/sales", { amount: 10 });
    await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    finish({ data: {} });
    await Promise.all([first, second]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await financialWrite("/sales", { amount: 10 });
    expect(vi.mocked(apiClient.post).mock.calls[1][2]?.headers?.["Idempotency-Key"]).not.toBe(vi.mocked(apiClient.post).mock.calls[0][2]?.headers?.["Idempotency-Key"]);
  });
  it("clears definitive validation failures and separates accounts", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { status: 400 } });
    await expect(financialWrite("/sales", { amount: 10 })).rejects.toMatchObject({ response: { status: 400 } });
    expect(localStorage.getItem("tenvora_pending_writes")).toBe("{}");
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Network Error"));
    await expect(financialWrite("/sales", { amount: 10 })).rejects.toThrow();
    localStorage.setItem("user", JSON.stringify({ id: "other", tenantId: "workspace" }));
    await expect(financialWrite("/sales", { amount: 10 })).rejects.toThrow();
    expect(vi.mocked(apiClient.post).mock.calls[1][2]?.headers?.["Idempotency-Key"]).not.toBe(vi.mocked(apiClient.post).mock.calls[2][2]?.headers?.["Idempotency-Key"]);
  });
  it("keeps the uncertainty message visible in the UI", () => {
    expect(getApiErrorInfo({ code: "write_uncertain" }, "Could not save", false).message).toContain("original request ID");
  });
});
