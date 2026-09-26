import React from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./common/BrandMark";

interface BrandLogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "badge" | "symbol" | "monochrome";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  to = "/",
  size = "md",
  className = "",
  variant = "badge",
}) => {
  const iconPixelSizes = {
    sm: 28,
    md: 34,
    lg: 42,
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 select-none group ${className}`.trim()}>
      <BrandMark
        size={iconPixelSizes[size]}
        variant={variant}
        className="group-hover:scale-105 transition-transform duration-200"
      />

      <div className="flex items-center gap-1.5 leading-none">
        <span className={`${textSizes[size]} font-bold tracking-[-0.035em] text-foreground`}>
          Tenvora
        </span>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
};
