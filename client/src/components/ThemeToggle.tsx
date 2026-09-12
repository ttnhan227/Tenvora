import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

export const ThemeToggle = ({ className, iconClassName }: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("rounded-full text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className={cn("h-4 w-4", iconClassName)} /> : <Moon className={cn("h-4 w-4", iconClassName)} />}
    </Button>
  );
};