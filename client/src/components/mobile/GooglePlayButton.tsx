import { useState } from "react";
import { Download, Sparkles, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GooglePlayButtonProps {
  className?: string;
  variant?: "badge" | "button" | "card";
  downloadUrl?: string;
}

export function GooglePlayButton({
  className = "",
  downloadUrl = "https://github.com/ttnhan227/Tenvora/releases/download/mobile-latest/tenvora-mobile.apk",
}: GooglePlayButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative inline-flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-left text-white shadow-md transition-all hover:border-zinc-500 hover:bg-zinc-900 hover:shadow-lg active:scale-[0.98] ${className}`}
        aria-label="Get it on Google Play (Coming soon)"
      >
        {/* Google Play Colorful Triangle SVG */}
        <svg
          viewBox="0 0 512 512"
          className="h-7 w-7 shrink-0"
          aria-hidden="true"
        >
          <path
            fill="#00d3ff"
            d="M32.5 18.5C28.2 23.3 25.6 30.5 25.6 39.8v432.4c0 9.3 2.6 16.5 6.9 21.3l2.4 2.4 242-242.3v-5.6L34.9 16.1l-2.4 2.4z"
          />
          <path
            fill="#00e676"
            d="M357.7 323.5l-80.8-80.8v-5.6l80.8-80.8 1.9 1.1 95.8 54.4c27.4 15.5 27.4 41 0 56.5l-95.8 54.4-1.9 0.8z"
          />
          <path
            fill="#ff3a44"
            d="M359.6 322.7L276.9 240 32.5 484.4c9.1 9.6 24 10.8 40.7 1.4l286.4-163.1"
          />
          <path
            fill="#ffce00"
            d="M359.6 189.3L73.2 26.2C56.5 16.8 41.6 18 32.5 27.6L276.9 272l82.7-82.7z"
          />
        </svg>

        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Get it on
          </span>
          <span className="text-base font-bold leading-tight tracking-tight text-white">
            Google Play
          </span>
        </div>

        {/* Coming Soon Pill */}
        <span className="ml-1 inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">
          Coming Soon
        </span>
      </button>

      {/* Play Store Info Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Google Play Store Release
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Tenvora for Android is currently in Play Console testing and will be listed on Google Play soon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-foreground/80">
            <div className="flex items-start gap-3 rounded-xl border bg-card/60 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
              <p className="text-xs leading-relaxed">
                <strong>No waiting required:</strong> You can download and run the full, official Android APK directly right now.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-card/60 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
              <p className="text-xs leading-relaxed">
                <strong>Identical features:</strong> The standalone APK includes receipt photo capture, offline caching, debt ledger, and instant sync.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="w-full sm:flex-1"
              onClick={() => setOpen(false)}
            >
              <a href={downloadUrl} download="tenvora-mobile.apk">
                <Download className="mr-2 h-4 w-4" />
                Download Direct APK
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
