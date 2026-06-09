"use client";

import { useState } from "react";

export default function RecalculateButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/ranking?recalculate=1");
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const labels = {
    idle: "คำนวณอันดับใหม่",
    loading: "กำลังคำนวณ...",
    done: "คำนวณสำเร็จ ✓",
    error: "เกิดข้อผิดพลาด",
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="py-3 px-5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium text-center hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {labels[state]}
    </button>
  );
}
