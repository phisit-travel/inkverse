"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import ReferralLink from "./ReferralLink";

type Work = { slug: string; title: string; coverUrl: string | null; type: string };

function CopyBtn({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="px-3 py-1.5 border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-colors rounded inline-flex items-center gap-1.5"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? done : label}
    </button>
  );
}

export default function PromoteKit({ works, refCode }: { works: Work[]; refCode: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const enc = encodeURIComponent;
  const chip = "px-3 py-1.5 border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/50 transition-colors rounded";

  return (
    <div className="space-y-8">
      {/* Referral — creators earn when their fans sign up + top up */}
      <section>
        <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.15em] uppercase mb-1">ลิงก์ชวนแฟนของคุณ</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          แฟนสมัครผ่านลิงก์นี้ → เขารับ 20 เหรียญ · พอเขาเติมเงินครั้งแรก <span className="text-[var(--text-primary)]">คุณรับ 20 เหรียญ</span> (ได้คนอ่าน + ได้เหรียญ)
        </p>
        <ReferralLink code={refCode} />
      </section>

      {/* Per-work share */}
      <section>
        <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.15em] uppercase mb-3">แชร์ผลงานของคุณ</h2>
        {works.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">ยังไม่มีผลงาน — ลงเรื่องก่อนแล้วกลับมาแชร์ได้เลย</p>
        ) : (
          <div className="space-y-3">
            {works.map((w) => {
              const url = `${origin}/content/${w.slug}`;
              const caption = `อ่าน "${w.title}" แปลไทยที่ INKVERSE ฟรี! ${url}`;
              const shares = [
                { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(`อ่าน "${w.title}" แปลไทยที่ INKVERSE`)}&url=${enc(url)}` },
                { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
                { label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(`อ่าน "${w.title}" ที่ INKVERSE`)}` },
              ];
              return (
                <div key={w.slug} className="flex flex-col sm:flex-row gap-4 border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                  <div className="w-16 h-[5.5rem] shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
                    {w.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.coverUrl} alt={w.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{w.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2.5 uppercase">{w.type}</p>
                    <div className="flex flex-wrap gap-2">
                      <CopyBtn text={url} label="คัดลอกลิงก์" done="คัดลอกแล้ว" />
                      {shares.map((s) => (
                        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={chip}>{s.label}</a>
                      ))}
                      <CopyBtn text={caption} label="คัดลอกแคปชั่น" done="คัดลอกแคปชั่นแล้ว" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-secondary)]">
        <p className="text-[var(--text-primary)] font-semibold mb-1">เคล็ดลับโปรโมต</p>
        โพสต์ลงที่ที่แฟนคุณอยู่ — Twitter/X (#นิยายวาย #มังงะแปลไทย), TikTok (คลิปพรีวิวฉากเด็ด), กลุ่ม Facebook, Discord · โพสต์สม่ำเสมอ ทุกตอนใหม่ = โอกาสดึงคนกลับมา
      </div>
    </div>
  );
}
