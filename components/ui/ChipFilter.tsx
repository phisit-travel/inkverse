"use client";

import clsx from "clsx";

interface Chip {
  label: string;
  value: string;
}

interface ChipFilterProps {
  chips: Chip[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
  // Single-row horizontal scroll instead of wrapping to multiple rows. Used by
  // the home genre bar so its height is stable (~36px) and doesn't shift the
  // page when it streams in. The parent supplies overflow-x-auto.
  nowrap?: boolean;
}

export default function ChipFilter({
  chips,
  selected,
  onChange,
  className,
  nowrap,
}: ChipFilterProps) {
  return (
    <div
      className={clsx(
        "flex gap-2",
        nowrap ? "flex-nowrap" : "flex-wrap",
        className
      )}
    >
      {chips.map((chip) => {
        const isActive = chip.value === selected;
        return (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className={clsx(
              "px-4 py-1.5 text-sm font-medium",
              nowrap && "shrink-0 whitespace-nowrap",
              isActive
                ? "bal-btn"
                : "bal-invert bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]"
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
