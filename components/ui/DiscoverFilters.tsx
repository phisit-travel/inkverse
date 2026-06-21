"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface DiscoverFiltersProps {
  genres: Genre[];
  current: {
    genre?: string;
    status?: string;
    type?: string;
    country?: string;
    sort?: string;
    q?: string;
  };
}

export default function DiscoverFilters({ genres, current }: DiscoverFiltersProps) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string>) {
    const p = { ...current, ...overrides };
    const qs = Object.entries(p)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `/discover?${qs}`;
  }

  function navigate(key: string, value: string) {
    router.push(buildUrl({ [key]: value, page: "1" }));
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <SlidersHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />

      <select
        onChange={(e) => navigate("genre", e.target.value)}
        defaultValue={current.genre || ""}
        aria-label="กรองตามหมวดหมู่"
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
      >
        <option value="">ทุกหมวดหมู่</option>
        {genres.map((g) => (
          <option key={g.id} value={g.slug}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        onChange={(e) => navigate("status", e.target.value)}
        defaultValue={current.status || ""}
        aria-label="กรองตามสถานะ"
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
      >
        <option value="">ทุกสถานะ</option>
        <option value="ONGOING">กำลังดำเนินเรื่อง</option>
        <option value="COMPLETED">จบแล้ว</option>
        <option value="HIATUS">หยุดพัก</option>
      </select>

      <select
        onChange={(e) => navigate("type", e.target.value)}
        defaultValue={current.type || ""}
        aria-label="กรองตามประเภท"
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
      >
        <option value="">ทุกประเภท</option>
        <option value="MANGA">Manga</option>
        <option value="MANHWA">Manhwa</option>
        <option value="MANHUA">Manhua</option>
        <option value="NOVEL">Novel</option>
      </select>

      <select
        onChange={(e) => navigate("country", e.target.value)}
        defaultValue={current.country || ""}
        aria-label="กรองตามประเทศ"
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
      >
        <option value="">ทุกประเทศ</option>
        <option value="JP">🇯🇵 ญี่ปุ่น</option>
        <option value="KR">🇰🇷 เกาหลี</option>
        <option value="CN">🇨🇳 จีน</option>
        <option value="TH">🇹🇭 ไทย</option>
      </select>

      <select
        onChange={(e) => navigate("sort", e.target.value)}
        defaultValue={current.sort || "views"}
        aria-label="เรียงลำดับ"
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
      >
        <option value="views">ยอดชม</option>
        <option value="latest">อัปเดตล่าสุด</option>
        <option value="bookmarks">บุ๊กมาร์ก</option>
      </select>
    </div>
  );
}
