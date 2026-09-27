import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function LanguageToggle({
  className,
  variant = "ghost",
  size = "sm",
  showLabel = true,
}: LanguageToggleProps) {
  const { language, setLanguage, isVietnamese } = useLanguage();

  const toggle = () => {
    setLanguage(isVietnamese ? "en" : "vi");
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggle}
      title={isVietnamese ? "Chuyển sang Tiếng Anh (English)" : "Chuyển sang Tiếng Việt (Vietnamese)"}
      aria-label={isVietnamese ? "Switch to English" : "Chuyển sang Tiếng Việt"}
      className={cn(
        "friendly-focus items-center gap-1.5 font-bold rounded-xl transition-all",
        className
      )}
    >
      <span className="text-base leading-none" role="img" aria-hidden="true">
        {isVietnamese ? "🇻🇳" : "🇬🇧"}
      </span>
      {showLabel && (
        <span className="text-xs uppercase tracking-wide">
          {isVietnamese ? "VI" : "EN"}
        </span>
      )}
    </Button>
  );
}
