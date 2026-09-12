import React from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./common/BrandMark";

interface BrandLogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBadge?: boolean;
  variant?: "badge" | "symbol" | "monochrome";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  to = "/",
  size = "md",
  className = "",
  showBadge = false,
  variant = "badge",
}) => {
  const iconPixelSizes = {
    sm: 24,
    md: 28,
    lg: 36,
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 select-none group ${className}`.trim()}>
      {/* Tenvora Current vector mark */}
      <BrandMark
        size={iconPixelSizes[size]}
        variant={variant}
        className="group-hover:scale-105 transition-transform duration-200"
      />

      {/* Brand Typography */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className={`${textSizes[size]} font-bold tracking-[-0.025em] text-slate-950 dark:text-white font-sans`}>
          Tenvora
        </span>
        {showBadge && (
          <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800/60">
            Freelance
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
};
