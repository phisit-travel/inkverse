"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

interface StarRatingProps {
  value?: number;
  onChange?: (score: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = "md",
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const display = readOnly ? value : hover || value;

  return (
    <div
      className="flex items-center gap-0.5"
      {...(readOnly
        ? { role: "img", "aria-label": `คะแนน ${value} จาก 5 ดาว` }
        : {})}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={readOnly ? undefined : `ให้คะแนน ${star} ดาว`}
          aria-hidden={readOnly || undefined}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={clsx(
            "transition-all duration-100",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={clsx(
              sizes[size],
              display >= star
                ? "fill-[var(--text-primary)] text-[var(--text-primary)]"
                : "fill-transparent text-[var(--text-muted)]"
            )}
          />
        </button>
      ))}
    </div>
  );
}
