import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { APK_DOWNLOAD_URL, PLAY_STORE_URL } from "@/lib/mobileDownloads";

interface GooglePlayButtonProps { className?: string; variant?: "badge" | "button" | "card"; downloadUrl?: string; }
export function GooglePlayButton({ className = "", downloadUrl = APK_DOWNLOAD_URL }: GooglePlayButtonProps) {
  const { isVietnamese } = useLanguage();
  return <div className={`flex flex-wrap items-center gap-4 ${className}`}>
    <Button asChild size="lg" className="font-bold">
      <a href={PLAY_STORE_URL ?? downloadUrl} download={PLAY_STORE_URL ? undefined : "tenvora-mobile.apk"}>
        {PLAY_STORE_URL ? <ExternalLink className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
        {PLAY_STORE_URL ? (isVietnamese ? "Tải trên Google Play" : "Get it on Google Play") : (isVietnamese ? "Tải APK Android" : "Download Android APK")}
      </a>
    </Button>
    {PLAY_STORE_URL && <a href={downloadUrl} download="tenvora-mobile.apk" className="text-sm font-semibold underline">{isVietnamese ? "Tải APK trực tiếp" : "Download APK instead"}</a>}
  </div>;
}
