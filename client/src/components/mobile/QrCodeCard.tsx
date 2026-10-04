import { useState, useEffect } from "react";
import { QrCode, Copy, Check, Smartphone, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QrCodeCardProps {
  className?: string;
  apkPath?: string;
}

export function QrCodeCard({
  className = "",
  apkPath = "https://github.com/ttnhan227/Tenvora/releases/download/mobile-latest/tenvora-mobile.apk",
}: QrCodeCardProps) {
  const [downloadUrl, setDownloadUrl] = useState(apkPath);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fullUrl = new URL(apkPath, window.location.origin).href;
      setDownloadUrl(fullUrl);
    }
  }, [apkPath]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      toast.success("Download link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link to clipboard.");
    }
  };

  // QR server endpoint for fast, sharp rendering of the download URL
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
    downloadUrl
  )}`;

  return (
    <div
      className={`paper-card relative overflow-hidden p-6 text-center sm:p-7 ${className}`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-xl pointer-events-none" />

      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <QrCode className="h-5 w-5" />
      </div>

      <h3 className="mt-3 text-base font-bold text-foreground">
        Scan to Install on Mobile
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Point your phone camera at this QR code to download the APK directly.
      </p>

      {/* QR Code Container */}
      <div className="relative mx-auto mt-4 flex h-48 w-48 items-center justify-center rounded-2xl border bg-white p-3 shadow-inner">
        <img
          src={qrApiUrl}
          alt="Tenvora Mobile Download QR Code"
          width={180}
          height={180}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="w-full text-xs font-semibold"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-[hsl(var(--success))]" />
              Link Copied!
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy Download Link
            </>
          )}
        </Button>

        <a
          href={apkPath}
          download="tenvora-mobile.apk"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Direct Download from Browser
        </a>
      </div>
    </div>
  );
}
