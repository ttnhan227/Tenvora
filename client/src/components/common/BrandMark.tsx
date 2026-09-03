import React from "react";

export function BrandMark({
  className = "",
  size = 24,
  variant = "gradient",
}: {
  className?: string;
  size?: number;
  variant?: "gradient" | "monochrome" | "badge";
}) {
  const gradientId = React.useId();

  if (variant === "badge") {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-xl p-1.5 shadow-md shadow-emerald-500/20 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 border border-emerald-400/30 text-white ${className}`.trim()}
        style={{ width: size, height: size }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Top T-Crossbar & Ledger Core */}
          <path
            d="M3.5 4.5 C3.5 3.95 3.95 3.5 4.5 3.5 H19.5 C20.05 3.5 20.5 3.95 20.5 4.5 V7.5 C20.5 8.05 20.05 8.5 19.5 8.5 H13.75 V19.5 C13.75 20.05 13.3 20.5 12.75 20.5 H11.25 C10.7 20.5 10.25 20.05 10.25 19.5 V8.5 H4.5 C3.95 8.5 3.5 8.05 3.5 7.5 V4.5 Z"
            fill="currentColor"
          />
          {/* Layer 1 Isometric Wings (Double-Entry Rails) */}
          <path
            d="M3 11.5 L12 15.5 L21 11.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          {/* Layer 2 Settlement Base */}
          <path
            d="M5 16.5 L12 19.8 L19 16.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          {/* Verified Invariant Node */}
          <circle cx="12" cy="6" r="1.5" fill="#34d399" />
        </svg>
      </div>
    );
  }

  return (
    <span
      className={`brand-mark inline-flex items-center justify-center shrink-0 ${className}`.trim()}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`${gradientId}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id={`${gradientId}-glow`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Outer Isometric Ledger Prism (Top Layer) */}
        <path
          d="M12 2.5 L21 6.8 L12 11.2 L3 6.8 Z"
          fill={variant === "gradient" ? `url(#${gradientId}-grad)` : "currentColor"}
          opacity="0.95"
        />

        {/* Dynamic Architectural T-Stem */}
        <path
          d="M10.25 10 V20.5 C10.25 21.05 10.7 21.5 11.25 21.5 H12.75 C13.3 21.5 13.75 21.05 13.75 20.5 V10"
          fill={variant === "gradient" ? `url(#${gradientId}-grad)` : "currentColor"}
        />

        {/* Double-Entry Debit Rail (Left to Right) */}
        <path
          d="M3 12.5 L12 16.8 L21 12.5"
          stroke={variant === "gradient" ? `url(#${gradientId}-glow)` : "currentColor"}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Settlement Clearing Rail (Bottom Layer) */}
        <path
          d="M5 17 L12 20.5 L19 17"
          stroke={variant === "gradient" ? `url(#${gradientId}-glow)` : "currentColor"}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />

        {/* Invariant Zero-Variance Node */}
        <circle
          cx="12"
          cy="6.8"
          r="1.8"
          fill="#ffffff"
          stroke={variant === "gradient" ? "#10b981" : "currentColor"}
          strokeWidth="0.75"
        />
      </svg>
    </span>
  );
}
