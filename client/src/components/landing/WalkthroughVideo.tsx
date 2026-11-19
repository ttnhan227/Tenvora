import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useReducedMotion";

export interface WalkthroughVideoProps {
  /** Base path without extension (serves `.webm` and `.mp4`). */
  srcBase: string;
  /** Static poster image path displayed before playback or under reduced motion. */
  poster: string;
  /** Explicit intrinsic width in CSS pixels to prevent layout shift. */
  width: number;
  /** Explicit intrinsic height in CSS pixels to prevent layout shift. */
  height: number;
  /** Accessible label describing the walkthrough video. */
  label: string;
  /** Defer fetching poster and video data for below-the-fold players. */
  lazy?: boolean;
  className?: string;
}

function supportsNativeMediaLazyLoading(): boolean {
  return (
    typeof HTMLMediaElement !== "undefined" &&
    Object.hasOwn(HTMLMediaElement.prototype, "loading")
  );
}

/**
 * Accessible looping product walkthrough video replacing multi-megabyte GIFs.
 * Respects `prefers-reduced-motion: reduce`, exposes native play/pause controls,
 * sets explicit dimensions for zero CLS, and defers offscreen downloads.
 */
export function WalkthroughVideo({
  srcBase,
  poster,
  width,
  height,
  label,
  lazy = false,
  className,
}: WalkthroughVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const nativeLazySupported = supportsNativeMediaLazyLoading();
  const canDeferWithObserver =
    lazy && !nativeLazySupported && typeof IntersectionObserver !== "undefined";
  const [inView, setInView] = useState<boolean>(() => !canDeferWithObserver);

  useEffect(() => {
    if (!canDeferWithObserver || inView) return;
    const node = videoRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [canDeferWithObserver, inView]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (reducedMotion) {
      node.removeAttribute("autoplay");
      node.pause?.();
    }
  }, [reducedMotion]);

  const shouldRenderSources = !canDeferWithObserver || inView;
  const shouldAutoPlay = !reducedMotion && shouldRenderSources;
  const lazyAttr = lazy ? ({ loading: "lazy" } as Record<string, string>) : {};

  return (
    <video
      ref={videoRef}
      controls
      loop
      muted
      playsInline
      autoPlay={shouldAutoPlay}
      width={width}
      height={height}
      poster={shouldRenderSources ? poster : undefined}
      preload={shouldRenderSources ? "metadata" : "none"}
      aria-label={label}
      className={className}
      style={{ aspectRatio: `${width} / ${height}` }}
      {...lazyAttr}
    >
      {shouldRenderSources && (
        <>
          <source src={`${srcBase}.webm`} type="video/webm" />
          <source src={`${srcBase}.mp4`} type="video/mp4" />
        </>
      )}
    </video>
  );
}
