import type { Metadata } from "next";
import { SpellCheck, AlignLeft, ShieldCheck, Gift, Check, X } from "lucide-react";
import QuoteForm from "@/components/ui/QuoteForm";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

export const metadata: Metadata = {
  title: "รับพิสูจน์อักษร & จัดเรียงหน้า นิยายไทย | INKVERSE",
  description:
    "บริการพิสูจน์อักษร เกลาภาษา และจัดเรียงหน้านิยายไทย โดยทีม INKVERSE — ประณีต เชื่อใจได้ ราคาเป็นมิตร ลูกค้าใหม่ฟรี 2,500 คำแรก",
  alternates: { canonical: `${BASE_URL}/services` },
};

export const revalidate = 3600;

const SERVICES = [
  {
    icon: SpellCheck,
    title: "พิสูจน์อักษร & เกลาภาษา",
    price: "เริ่มต้น 24 บาท / 1,000 คำ",
    includes: ["แก้คำสะกด · วรรณยุกต์ · เว้นวรรค", "จับคำผิด · คำตก · คำซ้ำ", "เกลาความสละสลวยเบื้องต้น (ไม่เปลี่ยนสำนวน)"],
  },
  {
    icon: AlignLeft,
    title: "จัดเรียงหน้า",
    price: "เริ่มต้น 8 บาท / 1,000 คำ",
    includes: ["ย่อหน้า · หัวข้อ · ระยะบรรทัดสม่ำเสมอ", "รูปแบบอ่านง่าย เป็นระเบียบทั้งเล่ม", "พร้อมนำไปเผยแพร่/ทำเล่ม"],
  },
];

const SCOPE_YES = ["แก้คำผิด / สะกด / วรรณยุกต์", "เว้นวรรค / คำซ้ำ / คำตก", "เกลาภาษาให้ลื่นไหลขึ้นเล็กน้อย", "จัดรูปแบบหน้าให้เป็นระเบียบ"];
const SCOPE_NO = ["ไม่รีไรต์ / ไม่เปลี่ยนสำนวนผู้เขียน", "ไม่แก้เนื้อเรื่อง / โครงเรื่อง", "ไม่เพิ่ม-ลดเนื้อหา"];

export default function ServicesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="eyebrow justify-center mb-4">บริการโดย INKVERSE</p>
        <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-[var(--text-primary)] leading-none mb-4">
          พิสูจน์อักษร & จัดเรียงหน้า นิยายไทย
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          ให้งานเขียนของคุณสะอาด อ่านลื่น เป็นมืออาชีพ — ประณีต เชื่อใจได้ ราคาเป็นมิตร
          โดยทีมบรรณาธิการ INKVERSE
        </p>
      </div>

      {/* Promo */}
      <div className="mt-8 border border-[var(--text-primary)] bg-[var(--bg-surface)] p-5 flex items-center gap-4 max-w-2xl mx-auto">
        <Gift className="w-7 h-7 text-[var(--text-primary)] shrink-0" />
        <div>
          <p className="font-bebas text-2xl tracking-wider text-[var(--text-primary)] leading-none">ลูกค้าใหม่ — ฟรี 2,500 คำแรก</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">ลองคุณภาพงานก่อนตัดสินใจ ไม่มีค่าใช้จ่ายสำหรับ 2,500 คำแรกของลูกค้าใหม่</p>
        </div>
      </div>

      {/* Services + rough pricing */}
      <div className="mt-12 grid sm:grid-cols-2 gap-4">
        {SERVICES.map((s) => (
          <div key={s.title} className="border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <s.icon className="w-6 h-6 text-[var(--text-primary)] mb-3" />
            <h2 className="font-bebas text-2xl tracking-wider text-[var(--text-primary)] leading-none">{s.title}</h2>
            <p className="text-sm text-[var(--text-primary)] font-semibold mt-1.5">{s.price}</p>
            <ul className="mt-4 space-y-2">
              {s.includes.map((it) => (
                <li key={it} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-primary)]" /> {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center mt-3">
        ราคาประเมินจากความยาวและสภาพต้นฉบับ · ค่าบริการขั้นต่ำ 150 บาท/งาน · ขอใบเสนอราคาที่แน่นอนได้ฟรี · งานประณีต รับจำนวนจำกัดต่อรอบ · ระยะเวลาขึ้นอยู่กับปริมาณงาน
      </p>

      {/* Scope */}
      <div className="mt-12 grid sm:grid-cols-2 gap-4">
        <div className="border border-[var(--border)] p-6">
          <h3 className="font-bebas text-xl tracking-wider text-[var(--text-primary)] mb-3">สิ่งที่เราทำ</h3>
          <ul className="space-y-2">
            {SCOPE_YES.map((it) => (
              <li key={it} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-primary)]" /> {it}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-[var(--border)] p-6">
          <h3 className="font-bebas text-xl tracking-wider text-[var(--text-primary)] mb-3">สิ่งที่เราไม่แตะ</h3>
          <ul className="space-y-2">
            {SCOPE_NO.map((it) => (
              <li key={it} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                <X className="w-4 h-4 mt-0.5 shrink-0" /> {it}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--text-muted)] mt-4 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> เคารพสำนวนผู้เขียน · ต้นฉบับเป็นความลับ
          </p>
        </div>
      </div>

      {/* How it works — the flow from quote to delivery (incl. payment) */}
      <div className="mt-14">
        <h2 className="font-bebas text-3xl tracking-wider text-[var(--text-primary)] text-center mb-8">ขั้นตอนการทำงาน</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { n: "01", t: "ขอใบเสนอราคา", d: "วางต้นฉบับ ดูราคาประเมินทันที — ฟรี ไม่มีข้อผูกมัด" },
            { n: "02", t: "ยืนยัน & วางมัดจำ", d: "ตกลงขอบเขตงาน ชำระมัดจำ 40% ผ่าน PromptPay แล้วเราเริ่มงานทันที" },
            { n: "03", t: "เราจัดทำให้", d: "พิสูจน์อักษร/จัดหน้าอย่างประณีต แจ้งกำหนดส่งเมื่อยืนยันงาน" },
            { n: "04", t: "รับงาน & ชำระส่วนที่เหลือ", d: "ตรวจงาน ชำระอีก 60% แล้วรับไฟล์ฉบับสมบูรณ์" },
          ].map((s) => (
            <div key={s.n} className="border border-[var(--border)] p-5">
              <p className="font-bebas text-3xl tracking-wider text-[var(--text-muted)] leading-none mb-3">{s.n}</p>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{s.t}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          ชำระผ่าน PromptPay · มัดจำ 40% ก่อนเริ่มงาน ที่เหลือ 60% เมื่อส่งมอบ · ต้นฉบับเป็นความลับตลอดกระบวนการ
        </p>
      </div>

      {/* Quote form */}
      <div className="mt-14 max-w-xl mx-auto">
        <h2 className="font-bebas text-3xl tracking-wider text-[var(--text-primary)] text-center mb-2">ขอใบเสนอราคา</h2>
        <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
          วางข้อความนิยายเพื่อ<b className="text-[var(--text-primary)]">คำนวณราคาอัตโนมัติทันที</b> — ต้นฉบับนับในเครื่องคุณ ไม่ถูกส่งออก (ลูกค้าใหม่ฟรี 2,500 คำแรก)
        </p>
        <QuoteForm />
      </div>
    </div>
  );
}
