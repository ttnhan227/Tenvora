import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { authService } from "@/services/authService";
import apiClient from "@/services/apiClient";
import DeleteAccountPage from "@/pages/DeleteAccountPage";
import PrivacyPage from "@/pages/PrivacyPage";

vi.mock("@/services/apiClient", () => ({default: {get: vi.fn(), post: vi.fn()}}));
const profile = {id: "u", tenantId: "t", email: "owner@test.invalid", role: "TenantAdmin", isActive: true, companyName: "Fixture", preferredCurrency: "USD"};
function seed() {
  localStorage.setItem("accessToken", `h.${btoa(JSON.stringify({exp: Math.floor(Date.now()/1000)+3600}))}.s`);
  localStorage.setItem("refreshToken", "refresh");
  localStorage.setItem("user", JSON.stringify(profile));
}
function Probe() { const {user,isLoading} = useAuth(); return <div>{isLoading ? "Loading" : user?.email || "Signed out"}</div>; }
beforeEach(() => {vi.restoreAllMocks(); vi.mocked(apiClient.get).mockReset(); vi.mocked(apiClient.post).mockReset(); localStorage.clear();});
describe("release readiness", () => {
  it("keeps a saved web session on temporary profile failure and retries", async () => {
    seed(); vi.spyOn(authService,"getProfile").mockResolvedValueOnce({success:false,status:503}).mockResolvedValue({success:true,data:profile});
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByRole("alert"); expect(localStorage.getItem("refreshToken")).toBe("refresh");
    fireEvent.click(screen.getByRole("button",{name:"Try again"}));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText(profile.email)).toBeInTheDocument();
  });
  it("refresh transport failure is retryable without deleting credentials", async () => {
    localStorage.setItem("refreshToken","refresh"); vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("offline"));
    await expect(authService.refreshSession()).rejects.toThrow("offline");
    expect(localStorage.getItem("refreshToken")).toBe("refresh");
  });
  it("does not restore a web session after logout while refresh is pending", async () => {
    localStorage.setItem("refreshToken","refresh");
    let resolve!: (value: unknown) => void;
    vi.mocked(apiClient.post).mockImplementationOnce(() => new Promise(r => {resolve = r;}) as never);
    const refresh = authService.refreshSession(); localStorage.clear();
    resolve({data:{data:{accessToken:"late",refreshToken:"late-refresh"}}});
    expect(await refresh).toBe(false); expect(localStorage.getItem("accessToken")).toBeNull();
  });
  it("public deletion page requires exact account confirmation before deleting", async () => {
    seed(); vi.spyOn(authService,"getProfile").mockResolvedValue({success:true,data:profile});
    vi.mocked(apiClient.post).mockResolvedValue({data:{success:true}});
    render(<BrowserRouter><LanguageProvider defaultLanguage="en"><AuthProvider><DeleteAccountPage /></AuthProvider></LanguageProvider></BrowserRouter>);
    const button = await screen.findByRole("button",{name:"Delete permanently"});
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Enter your email to confirm"),{target:{value:profile.email}});
    fireEvent.click(button);
    await screen.findByText("Your account has been deleted.");
    expect(apiClient.post).toHaveBeenCalledWith("/account/delete",{confirmationEmail:profile.email});
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
  it("privacy page explains AI processing and links to web deletion", () => {
    render(<BrowserRouter><LanguageProvider defaultLanguage="en"><PrivacyPage /></LanguageProvider></BrowserRouter>);
    expect(screen.getByRole("link",{name:"Delete your account"})).toHaveAttribute("href","/delete-account");
    expect(screen.getByText(/your question and relevant business context are sent to Google Gemini/)).toBeInTheDocument();
  });
});
