import React from "react";

export interface BrandMarkProps {
  className?: string;
  size?: number;
  variant?: "badge" | "symbol" | "monochrome" | "gradient";
}

/** A friendly record card: a paper page, notebook lines, and a clear T. */
export function BrandMark({ className = "", size = 32, variant = "badge" }: BrandMarkProps) {
  const monochrome = variant === "monochrome";
  return (
    <span className={`inline-flex shrink-0 select-none ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="58" height="58" rx="17" fill={monochrome ? "currentColor" : "#2F6F5E"} />
        <path d="M17 14.5h24.5L49 22v27.5H17v-35Z" fill={monochrome ? "white" : "#FFF9E9"} />
        <path d="M41.5 14.5V22H49" stroke={monochrome ? "currentColor" : "#E4A64F"} strokeWidth="3" strokeLinejoin="round" />
        <path d="M23 29h20M23 36h20M23 43h12" stroke={monochrome ? "currentColor" : "#B9C9B9"} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22.5 22.5h15M30 22.5v17" stroke={monochrome ? "currentColor" : "#234F43"} strokeWidth="4" strokeLinecap="round" />
        <circle cx="48.5" cy="48.5" r="7.5" fill={monochrome ? "white" : "#E4A64F"} stroke={monochrome ? "currentColor" : "#2F6F5E"} strokeWidth="2" />
        <path d="m45.5 48.5 2 2 4-4.5" stroke={monochrome ? "currentColor" : "#234F43"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
