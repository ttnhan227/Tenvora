import React from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./common/BrandMark";

interface BrandLogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBadge?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  to = "/",
  size = "md",
  className = "",
  showBadge = true,
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
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* Custom Geometric Vector Logo Icon */}
      <BrandMark
        size={iconPixelSizes[size]}
        variant="badge"
        className="group-hover:scale-105 transition-transform duration-200"
      />

      {/* Brand Typography */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className={`${textSizes[size]} font-extrabold tracking-tight text-foreground font-sans`}>
          Tenvora
        </span>
        {showBadge && (
          <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] font-bold border border-[#C7D2FE] dark:border-[#6366F1]/40">
            PayOps
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
