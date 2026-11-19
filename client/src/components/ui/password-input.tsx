import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

/** Password input with an accessible visibility toggle button. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const { isVietnamese } = useLanguage();

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={
            visible
              ? (isVietnamese ? "Ẩn mật khẩu" : "Hide password")
              : (isVietnamese ? "Hiện mật khẩu" : "Show password")
          }
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((prev) => !prev)}
          className="friendly-focus absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
