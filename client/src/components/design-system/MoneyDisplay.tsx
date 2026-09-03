import React from "react";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  sign?: "always" | "auto" | "never";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  colorizeSign?: boolean;
}

export function MoneyDisplay({
  amount,
  currency = "USD",
  sign = "never",
  size = "md",
  className,
  colorizeSign = false,
}: MoneyDisplayProps) {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = absAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [whole, decimal] = formatted.split(".");

  const sizeClasses = {
    xs: "text-xs font-semibold",
    sm: "text-sm font-semibold",
    md: "text-base font-bold",
    lg: "text-xl font-bold tracking-tight",
    xl: "text-2xl sm:text-3xl font-extrabold tracking-tight",
  };

  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    SGD: "S$",
  };

  const symbol = currencySymbols[currency] || `${currency} `;

  let signPrefix = "";
  if (sign === "always") {
    signPrefix = isNegative ? "-" : "+";
  } else if (sign === "auto" && isNegative) {
    signPrefix = "-";
  }

  const signColor = colorizeSign
    ? isNegative
      ? "text-red-600 dark:text-red-400"
      : amount > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground"
    : "text-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-mono tabular-nums select-all",
        sizeClasses[size],
        signColor,
        className
      )}
    >
      {signPrefix && <span className="mr-0.5 opacity-80">{signPrefix}</span>}
      <span className="text-[0.85em] opacity-75 font-sans font-medium mr-0.5">{symbol}</span>
      <span>{whole}</span>
      <span className="text-[0.8em] opacity-65">.{decimal}</span>
      {currency && !currencySymbols[currency] && (
        <span className="ml-1.5 text-[0.7em] font-sans font-semibold uppercase tracking-wider text-muted-foreground">
          {currency}
        </span>
      )}
    </span>
  );
}
