"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChipFilter from "./ChipFilter";
import { useLang } from "./LangProvider";
import { dict } from "@/lib/i18n";

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
  const lang = useLang();

  // The server passes value="all" with a sentinel label; translate it here so
  // the chip reads "ทั้งหมด" in Thai and "All" in English.
  const translatedGenres = genres.map((g) =>
    g.value === "all" ? { ...g, label: dict[lang].genreAll } : g
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
      <ChipFilter chips={translatedGenres} selected={selected} onChange={handleChange} nowrap />
    </div>
  );
}
