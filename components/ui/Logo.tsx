"use client";

import Link from "next/link";
import clsx from "clsx";

interface LogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string;
}

const sizes = {
  sm: { hex: 28, font: "text-lg" },
  md: { hex: 36, font: "text-2xl" },
  lg: { hex: 48, font: "text-4xl" },
};

function HexInkMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2d55" />
          <stop offset="100%" stopColor="#ff6b2b" />
        </linearGradient>
      </defs>
      {/* Hexagon */}
      <polygon
        points="24,2 43,13 43,35 24,46 5,35 5,13"
        fill="url(#logoGrad)"
        opacity="0.15"
        stroke="url(#logoGrad)"
        strokeWidth="2"
      />
      {/* Ink nib */}
      <path
        d="M24 10 L30 22 L24 38 L18 22 Z"
        fill="url(#logoGrad)"
      />
      <path
        d="M24 10 L24 38"
        stroke="#080a10"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="38" r="2" fill="url(#logoGrad)" />
    </svg>
  );
}

export default function Logo({
  variant = "full",
  size = "md",
  className,
  href = "/",
}: LogoProps) {
  const { hex, font } = sizes[size];

  const content = (
    <span className={clsx("flex items-center gap-2 select-none", className)}>
      {variant !== "text" && <HexInkMark size={hex} />}
      {variant !== "icon" && (
        <span
          className={clsx(
            "font-bebas tracking-widest bg-gradient-to-r from-[#ff2d55] to-[#ff6b2b] bg-clip-text text-transparent",
            font
          )}
        >
          INKVERSE
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
