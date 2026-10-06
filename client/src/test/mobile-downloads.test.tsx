import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GooglePlayButton } from "@/components/mobile/GooglePlayButton";
import { QrCodeCard } from "@/components/mobile/QrCodeCard";
import { APK_DOWNLOAD_URL, resolvePlayStoreUrl } from "@/lib/mobileDownloads";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ isVietnamese: false }) }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("mobile download channel", () => {
  it("downloads the public APK directly while Play is unavailable", () => {
    render(<GooglePlayButton />);
    expect(screen.getByRole("link", { name: "Download Android APK" })).toHaveAttribute("href", APK_DOWNLOAD_URL);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    render(<QrCodeCard />);
    expect(new URL(screen.getByRole("img", { name: "Tenvora Mobile Download QR Code" }).getAttribute("src")!).searchParams.get("data")).toBe(APK_DOWNLOAD_URL);
  });
  it("rejects unsafe or unrelated store URLs", () => {
    for (const url of [undefined, "not a URL", "http://play.google.com/store/apps/details?id=com.tenvora.app", "https://example.com/store/apps/details?id=com.tenvora.app", "https://play.google.com/store/apps/details?id=other.app", "https://user@play.google.com/store/apps/details?id=com.tenvora.app"]) {
      expect(resolvePlayStoreUrl(url)).toBeUndefined();
    }
  });
  it("switches the primary install and QR destination together when Play is configured", async () => {
    const store = "https://play.google.com/store/apps/details?id=com.tenvora.app";
    vi.stubEnv("VITE_GOOGLE_PLAY_URL", store);
    vi.resetModules();
    const channels = await import("@/lib/mobileDownloads");
    expect(channels.PLAY_STORE_URL).toBe(store);
    expect(channels.MOBILE_INSTALL_URL).toBe(store);
    expect(channels.APK_DOWNLOAD_URL).toBe(APK_DOWNLOAD_URL);
    const { GooglePlayButton: PlayButton } = await import("@/components/mobile/GooglePlayButton");
    render(<PlayButton />);
    const primary = screen.getByRole("link", { name: "Get it on Google Play" });
    expect(primary).toHaveAttribute("href", store);
    expect(primary).not.toHaveAttribute("download");
    expect(screen.getByRole("link", { name: "Download APK instead" })).toHaveAttribute("href", APK_DOWNLOAD_URL);
    const { QrCodeCard: PlayQr } = await import("@/components/mobile/QrCodeCard");
    render(<PlayQr />);
    expect(new URL(screen.getByRole("img", { name: "Tenvora Mobile Download QR Code" }).getAttribute("src")!).searchParams.get("data")).toBe(store);
  });
});
