import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20 shadow-none",
        signal: "bg-[hsl(var(--accent-signal))] text-[hsl(var(--accent-signal-fg))] hover:brightness-95 border border-[hsl(var(--accent-signal))] shadow-none font-bold",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20",
        outline: "border border-border bg-card hover:bg-secondary text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border/40",
        ghost: "hover:bg-secondary hover:text-foreground text-muted-foreground",
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        xs: "h-7 px-2.5 text-[11px]",
        sm: "h-8 px-3 text-xs",
        lg: "h-9.5 px-4 text-xs font-bold",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
