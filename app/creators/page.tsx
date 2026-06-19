import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Percent, PenTool, Wallet, Trophy, Crown, Megaphone, ImagePlus, Clock,
  ArrowRight, Check, BookOpen,
} from "lucide-react";
import type { Metadata } from "next";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

export const metadata: Metadata = {
  title: "ลงงานกับ INKVERSE — ได้ 80% + เครื่องมือครบ | สมัครนักแปล/นักเขียน",
  description:
    "ลงมังงะแปลหรือเขียนนิยายบน INKVERSE รับส่วนแบ่ง 80% (สูงสุดในไทย) เครื่องมือเขียนระดับโปร ถอนเงินเข้าบัญชี และเราช่วยโปรโมตให้",
  alternates: { canonical: `${BASE_URL}/creators` },
};

export const revalidate = 3600;

const BENEFITS = [
  { icon: Percent, title: "ส่วนแบ่ง 80%", body: "ผู้อ่านปลดล็อกตอนของคุณ คุณได้ 80% แพลตฟอร์มหักแค่ 20% — สูงกว่าเจ้าอื่นในไทย" },
  { icon: PenTool, title: "เครื่องมือเขียนระดับโปร", body: "WYSIWYG เห็นผลทันที + แทรกรูป + บันทึกร่างอัตโนมัติ + ค้นหา-แทนที่ + นับคำ/เป้าหมาย" },
  { icon: Clock, title: "ตั้งเวลาโพสต์ + ร่าง", body: "เขียนเก็บไว้เป็นร่าง ตั้งเวลาเผยแพร่ล่วงหน้าได้ ปล่อยตอนเป็นเวลาเหมือนมืออาชีพ" },
  { icon: Wallet, title: "ถอนเงินจริง", body: "รายได้สะสมถอนเข้าบัญชีธนาคาร/พร้อมเพย์ได้ ระบบอัตโนมัติ โปร่งใส" },
  { icon: Trophy, title: "ระบบดึงแฟนคลับ", body: "ยศนักอ่าน · achievement · กรอบโปรไฟล์ · อันดับ — ทำให้ผู้อ่านติดและกลับมาอ่านงานคุณ" },
  { icon: Crown, title: "Membership + ร้านค้า (เร็วๆ นี้)", body: "สมาชิกรายเดือน + ขายของดิจิทัล — สร้างรายได้ประจำจากแฟนตัวจริง" },
  { icon: Megaphone, title: "เราช่วยโปรโมต", body: "งานดีได้ขึ้นหน้าแรก / อันดับ / ฟีดอัปเดต — ไม่ต้องหาคนอ่านเองคนเดียว" },
  { icon: ImagePlus, title: "ลงง่าย ไม่ยุ่งยาก", body: "อัปมังงะทีละหลายตอน หรือเขียนนิยายในเว็บได้เลย จัดการตอน/ราคา/ปกในที่เดียว" },
];

export default async function CreatorsPage() {
  const [mangaCount, chapterCount] = await Promise.all([
    prisma.manga.count(),
    prisma.chapter.count(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-14">
        <p className="eyebrow text-[var(--text-secondary)]">FOR CREATORS</p>
        <h1 className="font-bebas text-5xl sm:text-7xl text-[var(--text-primary)] tracking-wider leading-[0.95]">
          ลงงานกับ INKVERSE
        </h1>
        <p className="text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
          แปลมังงะหรือเขียนนิยาย — รับ <span className="text-[var(--text-primary)] font-semibold">80%</span> เครื่องมือครบ ถอนเงินจริง และเราช่วยโปรโมตให้
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-7">
          <Link href="/apply?as=writer" className="inline-flex items-center gap-2 px-6 py-3 bal-btn text-sm font-semibold uppercase tracking-widest">
            สมัครนักเขียน <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/apply?as=translator" className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold uppercase tracking-widest hover:bg-[var(--bg-card)] transition-colors">
            สมัครนักแปล <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Big 80% */}
      <div className="border-y border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 divide-x divide-[var(--border)] mb-14">
        <div className="py-8 text-center">
          <p className="font-bebas text-5xl sm:text-6xl text-[var(--text-primary)] tracking-wide leading-none">80%</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)] mt-2">ส่วนแบ่งให้คุณ</p>
        </div>
        <div className="py-8 text-center">
          <p className="font-bebas text-5xl sm:text-6xl text-[var(--text-primary)] tracking-wide leading-none">{mangaCount}+</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)] mt-2">เรื่องบนเว็บ</p>
        </div>
        <div className="py-8 text-center col-span-2 sm:col-span-1 border-t sm:border-t-0 border-[var(--border)]">
          <p className="font-bebas text-5xl sm:text-6xl text-[var(--text-primary)] tracking-wide leading-none">{(chapterCount / 1000).toFixed(0)}k+</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)] mt-2">ตอนพร้อมอ่าน</p>
        </div>
      </div>

      {/* Benefits */}
      <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.18em] uppercase flex items-center gap-3 mb-6">
        <span className="w-6 h-px bg-[var(--text-primary)]" /> ทำไมต้อง INKVERSE
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-14">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="w-11 h-11 flex items-center justify-center bg-[var(--text-primary)] text-[var(--bg-primary)] shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <h2 className="font-bebas text-2xl text-[var(--text-primary)] tracking-[0.18em] uppercase flex items-center gap-3 mb-6">
        <span className="w-6 h-px bg-[var(--text-primary)]" /> เริ่มยังไง
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-14">
        {[
          { n: "1", t: "สมัคร", b: "กรอกใบสมัคร (นามปากกา + ตัวอย่างผลงาน) ใช้เวลา 3 นาที" },
          { n: "2", t: "อนุมัติไว", b: "ทีมงานตรวจ + อนุมัติ เข้าแดชบอร์ดได้ทันที" },
          { n: "3", t: "ลงงาน + หาเงิน", b: "อัปมังงะ/เขียนนิยาย ตั้งตอนพรีเมียม รับ 80% ถอนเข้าบัญชี" },
        ].map((s) => (
          <div key={s.n} className="border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <p className="font-bebas text-4xl text-[var(--text-primary)] leading-none">{s.n}</p>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-2">{s.t}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{s.b}</p>
          </div>
        ))}
      </div>

      {/* trust bullets */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)] mb-12">
        {["เจ้าของลิขสิทธิ์เป็นของคุณ", "ถอนเงินโปร่งใส", "เครื่องมือเทพ อัปเดตเรื่อยๆ", "ชุมชนนักอ่านพร้อมซัพพอร์ต"].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--text-primary)]" /> {t}</span>
        ))}
      </div>

      {/* Final CTA */}
      <div className="text-center border border-[var(--text-primary)]/30 bg-[var(--bg-surface)] p-10">
        <BookOpen className="w-8 h-8 mx-auto text-[var(--text-primary)] mb-3" />
        <h2 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider">พร้อมเริ่มหารายได้จากงานของคุณ?</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">เปิดรับครีเอเตอร์รุ่นแรก — มาก่อนได้เปรียบ</p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link href="/apply?as=writer" className="inline-flex items-center gap-2 px-6 py-3 bal-btn text-sm font-semibold uppercase tracking-widest">
            สมัครนักเขียน <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/apply?as=translator" className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold uppercase tracking-widest hover:bg-[var(--bg-card)] transition-colors">
            สมัครนักแปล <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
