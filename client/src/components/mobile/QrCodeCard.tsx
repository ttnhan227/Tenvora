import { useLanguage } from "@/contexts/LanguageContext";
import { MOBILE_INSTALL_URL, PLAY_STORE_URL } from "@/lib/mobileDownloads";
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
  apkPath = MOBILE_INSTALL_URL,
}: QrCodeCardProps) {
  const { isVietnamese } = useLanguage();
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
      toast.success(isVietnamese ? "Đã sao chép liên kết cài đặt." : "Install link copied.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(isVietnamese ? "Không thể sao chép liên kết." : "Could not copy link.");
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
        {isVietnamese ? "Quét để cài trên điện thoại" : "Scan to install on your phone"}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {PLAY_STORE_URL ? (isVietnamese ? "Quét để mở Tenvora trên Google Play." : "Scan to open Tenvora on Google Play.") : (isVietnamese ? "Quét để tải APK Android chính thức." : "Scan to download the official Android APK.")}
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
              {isVietnamese ? "Đã sao chép!" : "Link copied!"}
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {isVietnamese ? "Sao chép liên kết" : "Copy install link"}
            </>
          )}
        </Button>

        <a
          href={apkPath}
          download={PLAY_STORE_URL ? undefined : "tenvora-mobile.apk"}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          {PLAY_STORE_URL ? (isVietnamese ? "Mở Google Play" : "Open Google Play") : (isVietnamese ? "Tải APK trực tiếp" : "Direct APK download")}
        </a>
      </div>
    </div>
  );
}
