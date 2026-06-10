"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors"
    >
      <LogOut className="w-4 h-4" /> ออกจากระบบ
    </button>
  );
}
