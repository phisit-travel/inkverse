"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";

export default function ProfileImageButton({
  type,
  label,
  className = "",
}: {
  type: "avatar" | "cover";
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/profile/image", { method: "POST", body: fd });
      if (res.ok) router.refresh();
      else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "อัปโหลดไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold uppercase tracking-widest px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 ${className}`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        {label}
      </button>
    </>
  );
}
