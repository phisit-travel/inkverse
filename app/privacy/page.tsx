import type { Metadata } from "next";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  description:
    "นโยบายความเป็นส่วนตัวของ INKVERSE อธิบายข้อมูลที่เราเก็บ วิธีใช้และปกป้องข้อมูล การใช้คุกกี้ และสิทธิ์ของคุณในการเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคล",
  alternates: { canonical: `${BASE_URL}/privacy` },
};

const sections: { h: string; p: string[] }[] = [
  { h: "1. ข้อมูลที่เราเก็บ", p: ["ข้อมูลบัญชี (ชื่อผู้ใช้ อีเมล), ข้อมูลการใช้งาน (ประวัติการอ่าน บุ๊กมาร์ก), ข้อมูลธุรกรรมเหรียญ และข้อมูลบัญชีธนาคารสำหรับนักแปลที่ขอถอนเงิน เราไม่เก็บเลขบัตรเครดิตของคุณ — การชำระเงินดำเนินการและจัดเก็บโดย Omise"] },
  { h: "2. การใช้ข้อมูล", p: ["ใช้เพื่อให้บริการ ยืนยันตัวตน ดำเนินธุรกรรม ป้องกันการทุจริต และพัฒนาประสบการณ์ผู้ใช้ เราไม่ขายข้อมูลส่วนบุคคลของคุณ"] },
  { h: "3. คุกกี้และเซสชัน", p: ["เราใช้คุกกี้เพื่อรักษาสถานะการเข้าสู่ระบบ (เซสชัน) และความปลอดภัยเท่านั้น"] },
  { h: "4. การเปิดเผยต่อบุคคลที่สาม", p: ["เปิดเผยเฉพาะผู้ให้บริการที่จำเป็น (เช่น ผู้ประมวลผลการชำระเงิน, ผู้ให้บริการอีเมล, ที่จัดเก็บไฟล์) ภายใต้ข้อตกลงรักษาความลับ หรือเมื่อกฎหมายกำหนด"] },
  { h: "5. ความปลอดภัย", p: ["รหัสผ่านเข้ารหัสด้วย bcrypt การเชื่อมต่อเข้ารหัส HTTPS และมีมาตรการป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต"] },
  { h: "6. สิทธิ์ของคุณ", p: ["คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้ โดยติดต่อ support@inkverse.io"] },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <p className="eyebrow mb-3">LEGAL</p>
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-[0.06em] uppercase mb-2">นโยบายความเป็นส่วนตัว</h1>
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-8">ปรับปรุงล่าสุด มิถุนายน 2569</p>
      <div className="space-y-7">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">{para}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
