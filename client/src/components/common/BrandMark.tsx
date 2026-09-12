import React from "react";

export interface BrandMarkProps {
  className?: string;
  size?: number;
  variant?: "badge" | "symbol" | "monochrome" | "gradient";
}

/**
 * Tenvora Current
 *
 * Three offset lanes turn variable freelance income into one composed financial
 * current. The asymmetry signals flexibility; the shared direction and measured
 * spacing signal control and stability.
 */
export function BrandMark({
  className = "",
  size = 28,
  variant = "badge",
}: BrandMarkProps) {
  if (variant === "badge" || variant === "gradient") {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-[24%] select-none ${className}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="24" fill="#0B1220" />
          <path fill="#4A6CFF" d="M29 17h49c5 0 8 4.7 6.3 9.4l-2.4 6.4c-1.2 3.3-4.5 5.2-8 5.2H20l4-12.1c1.7-5.2 3.1-7.8 5-8.9Z" />
          <path fill="#FFFFFF" d="M31 41h54l-4.1 12c-1.8 5.5-6.7 9-12.5 9H15l4.1-12C20.9 44.5 25.2 41 31 41Z" />
          <path fill="#16B39A" d="M25 65h44c5 0 8.1 4.7 6.5 9.4L73 81.1c-1.2 3.4-4.4 5.2-8 5.2H11l4-12.1c1.8-5.4 4.3-8.4 10-9.2Z" />
        </svg>
      </span>
    );
  }

  if (variant === "symbol") {
    return (
      <span
        className={`inline-flex shrink-0 select-none ${className}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path className="fill-[#3569FF] dark:fill-[#5B7CFF]" d="M28 14h52c5.5 0 9 5.2 7.1 10.4l-2.6 7C83.2 35.1 79.6 37 75.8 37H18l4.2-12.9C24.2 18 25.8 15.1 28 14Z" />
          <path className="fill-[#0B1220] dark:fill-[#F8FAFC]" d="M31 40h57l-4.4 12.9C81.7 58.8 76.5 63 70.3 63H13l4.4-12.9C19.3 44.2 24.8 40 31 40Z" />
          <path className="fill-[#0FA58E] dark:fill-[#21C4A8]" d="M24 66h47c5.4 0 8.8 5.1 7 10.2l-2.7 7.3C74 87.1 70.6 89 66.8 89H9l4.2-12.9C15.2 70 17.8 67.1 24 66Z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 select-none ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 14h52c5.5 0 9 5.2 7.1 10.4l-2.6 7C83.2 35.1 79.6 37 75.8 37H18l4.2-12.9C24.2 18 25.8 15.1 28 14Z" />
        <path d="M31 40h57l-4.4 12.9C81.7 58.8 76.5 63 70.3 63H13l4.4-12.9C19.3 44.2 24.8 40 31 40Z" />
        <path d="M24 66h47c5.4 0 8.8 5.1 7 10.2l-2.7 7.3C74 87.1 70.6 89 66.8 89H9l4.2-12.9C15.2 70 17.8 67.1 24 66Z" />
      </svg>
    </span>
  );
}
