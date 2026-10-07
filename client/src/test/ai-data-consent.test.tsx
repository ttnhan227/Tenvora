import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiDataConsent } from "@/components/assistant/AiDataConsent";
import { requireAiConsent } from "@/lib/aiConsent";
import { aiAssistantService } from "@/services/aiService";
import apiClient from "@/services/apiClient";

const account = vi.hoisted(() => ({ user: { id: "reviewer" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => account }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ isVietnamese: false }) }));
vi.mock("@/services/apiClient", () => ({ default: { post: vi.fn() } }));

afterEach(() => { account.user = { id: "reviewer" }; vi.clearAllMocks(); });

describe("AI data disclosure", () => {
  it("does not transmit before agreement and cancellation sends no data", async () => {
    render(<AiDataConsent />);
    const request = aiAssistantService.agentChat({ message: "Check customer balances" });
    expect(await screen.findByRole("heading", { name: "Before using AI" })).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini to answer/)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect((await request).success).toBe(false);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("allows requests after agreement and resets consent when accounts change", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    const view = render(<AiDataConsent />);
    const request = aiAssistantService.parseRecord("Sale 100");
    fireEvent.click(await screen.findByRole("button", { name: "Agree and continue" }));
    expect((await request).success).toBe(true);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(await requireAiConsent()).toBe(true);
    account.user = { id: "other-user" };
    view.rerender(<AiDataConsent />);
    const next = aiAssistantService.chat("Show my records");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Before using AI" })).toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect((await next).success).toBe(false);
  });

  it("fails closed without a mounted disclosure", async () => {
    expect(await requireAiConsent()).toBe(false);
    expect((await aiAssistantService.proposeAction("Add a customer")).success).toBe(false);
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
