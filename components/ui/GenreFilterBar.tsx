"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChipFilter from "./ChipFilter";

interface Genre {
  label: string;
  value: string;
}

interface GenreFilterBarProps {
  genres: Genre[];
}

export default function GenreFilterBar({ genres }: GenreFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(
    searchParams.get("genre") || "all"
  );

  const handleChange = (value: string) => {
    setSelected(value);
    if (value === "all") {
      router.push("/manga");
    } else {
      router.push(`/manga/${value}`);
    }
  };

  return (
    <div className="overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      <ChipFilter chips={genres} selected={selected} onChange={handleChange} />
    </div>
  );
}
