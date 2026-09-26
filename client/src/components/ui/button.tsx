import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-[background-color,color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary shadow-[0_2px_0_hsl(var(--brand-ink)/.18)]",
        signal: "bg-[hsl(var(--accent-signal))] text-[hsl(var(--accent-signal-fg))] hover:brightness-95 border border-[hsl(var(--accent-signal))] shadow-none font-bold",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20",
        outline: "border border-border bg-card hover:border-primary/40 hover:bg-accent/50 text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border/40",
        ghost: "hover:bg-secondary hover:text-foreground text-foreground/80",
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-11 px-4 py-2",
        xs: "h-8 px-3 text-xs",
        sm: "h-10 px-3.5 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
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
