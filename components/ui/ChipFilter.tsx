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
}

export default function ChipFilter({
  chips,
  selected,
  onChange,
  className,
}: ChipFilterProps) {
  return (
    <div
      className={clsx(
        "flex flex-wrap gap-2",
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
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b2b] text-white shadow-lg shadow-[#ff2d55]/25"
                : "bg-[#1a1e2a] text-gray-400 border border-white/10 hover:border-[#ff2d55]/40 hover:text-white"
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
