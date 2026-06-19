import type { Metadata } from "next";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

export const metadata: Metadata = {
  title: "นโยบายลิขสิทธิ์ (DMCA)",
  description:
    "นโยบายลิขสิทธิ์ของ INKVERSE หากผลงานของคุณถูกเผยแพร่โดยละเมิดลิขสิทธิ์ เรียนรู้วิธีส่งคำร้อง DMCA และขั้นตอนที่เราใช้ลบเนื้อหาที่ละเมิดอย่างรวดเร็ว",
  alternates: { canonical: `${BASE_URL}/dmca` },
};

export default function DmcaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <p className="eyebrow mb-3">LEGAL</p>
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-[0.06em] uppercase mb-2">นโยบายลิขสิทธิ์ (DMCA)</h1>
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-8">การแจ้งเตือนการละเมิดลิขสิทธิ์</p>
      <div className="space-y-7 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p>INKVERSE เคารพสิทธิ์ในทรัพย์สินทางปัญญาของผู้อื่น และคาดหวังให้ผู้ใช้ทำเช่นเดียวกัน หากคุณเชื่อว่าผลงานของคุณถูกนำมาเผยแพร่บนแพลตฟอร์มโดยละเมิดลิขสิทธิ์ กรุณาส่งคำร้องมาที่ <span className="text-[var(--text-primary)]">dmca@inkverse.io</span></p>
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">คำร้องต้องระบุ</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>ข้อมูลติดต่อของคุณ (ชื่อ อีเมล)</li>
            <li>รายละเอียดผลงานที่ถูกละเมิดและหลักฐานความเป็นเจ้าของ</li>
            <li>ลิงก์ (URL) ของเนื้อหาที่ละเมิดบนเว็บไซต์</li>
            <li>คำรับรองว่าข้อมูลถูกต้องและคุณเป็นเจ้าของสิทธิ์หรือได้รับมอบอำนาจ</li>
          </ul>
        </section>
        <p>เมื่อได้รับคำร้องที่ครบถ้วน เราจะตรวจสอบและลบหรือระงับการเข้าถึงเนื้อหาที่ละเมิดโดยเร็ว และอาจระงับบัญชีผู้ที่ละเมิดซ้ำ</p>
      </div>
    </div>
  );
}
