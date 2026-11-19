import { act, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";
import { WalkthroughVideo } from "@/components/landing/WalkthroughVideo";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

function mockMatchMedia(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? reduced : false,
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

describe("TEN-WEB-01: Landing walkthrough media and reduced-motion support", () => {
  const originalObserver = window.IntersectionObserver;

  beforeEach(() => {
    mockMatchMedia(false);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    window.IntersectionObserver = originalObserver;
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it("renders landing walkthrough videos with explicit dimensions, controls, WebM/MP4 sources, and poster", () => {
    render(
      <MemoryRouter>
        <LanguageProvider fixedLanguage="en">
          <Index />
        </LanguageProvider>
      </MemoryRouter>,
    );

    const desktopVideo = screen.getByLabelText("Tenvora Web Live Walkthrough") as HTMLVideoElement;
    expect(desktopVideo).toHaveAttribute("width", "840");
    expect(desktopVideo).toHaveAttribute("height", "524");
    expect(desktopVideo).toHaveAttribute("poster", "/tenvora-demo-poster.webp");
    expect(desktopVideo).toHaveAttribute("controls");
    expect(desktopVideo).not.toHaveAttribute("loading", "lazy");

    const sources = Array.from(desktopVideo.querySelectorAll("source"));
    expect(sources.map((s) => s.getAttribute("src"))).toEqual([
      "/tenvora-demo.webm",
      "/tenvora-demo.mp4",
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Mobile App/i }));
    const heroMobileVideo = screen.getByLabelText("Tenvora Mobile Companion Walkthrough") as HTMLVideoElement;
    expect(heroMobileVideo).toHaveAttribute("width", "380");
    expect(heroMobileVideo).toHaveAttribute("height", "822");
    expect(heroMobileVideo).toHaveAttribute("poster", "/tenvora-mobile-demo-poster.webp");
  });

  it("defers below-the-fold lazy video sources with IntersectionObserver when native media lazy-loading is absent", () => {
    let observerCallback: IntersectionObserverCallback | null = null;
    class MockObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "200px 0px";
      readonly thresholds = [0];
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;

    const { container } = render(
      <WalkthroughVideo
        srcBase="/tenvora-mobile-demo"
        poster="/tenvora-mobile-demo-poster.webp"
        width={380}
        height={822}
        lazy
        label="Below-fold mobile preview"
      />,
    );

    const video = screen.getByLabelText("Below-fold mobile preview") as HTMLVideoElement;
    expect(video).toHaveAttribute("loading", "lazy");
    if (!Object.hasOwn(HTMLMediaElement.prototype, "loading")) {
      expect(video).toHaveAttribute("preload", "none");
      expect(video.querySelectorAll("source")).toHaveLength(0);

      act(() => {
        observerCallback?.(
          [{ isIntersecting: true, target: video } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });
      expect(container.querySelectorAll("source")).toHaveLength(2);
    }
  });

  it("disables autoplay and pauses video when prefers-reduced-motion is reduce", () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);

    render(
      <WalkthroughVideo
        srcBase="/tenvora-demo"
        poster="/tenvora-demo-poster.webp"
        width={840}
        height={524}
        label="Reduced motion desktop preview"
      />,
    );

    const video = screen.getByLabelText("Reduced motion desktop preview") as HTMLVideoElement;
    expect(video).not.toHaveAttribute("autoplay");
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
