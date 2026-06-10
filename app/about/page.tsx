import type { Metadata } from "next";

export const metadata: Metadata = { title: "เกี่ยวกับเรา | INKVERSE" };

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <p className="eyebrow mb-3">INKVERSE</p>
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-[0.06em] uppercase mb-6">เกี่ยวกับเรา</h1>
      <div className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p>INKVERSE คือแพลตฟอร์มอ่านการ์ตูน มังงะ มังฮวา และมันฮัวออนไลน์ ที่สนับสนุนนักแปลไทยให้สร้างสรรค์ผลงานคุณภาพ และได้รับค่าตอบแทนที่เป็นธรรมผ่านระบบเหรียญ</p>
        <p>เรามุ่งสร้างระบบนิเวศที่นักอ่านสนับสนุนนักแปลโดยตรง นักแปลได้ส่วนแบ่ง 80% จากการปลดล็อกตอนพรีเมียม และสามารถถอนเงินเข้าบัญชีธนาคารได้อัตโนมัติ</p>
        <p>ติดต่อทีมงานได้ที่หน้า <a href="/contact" className="text-[var(--text-primary)] hover:underline">ติดต่อแอดมิน</a> หรืออีเมล support@inkverse.io</p>
      </div>
    </div>
  );
}
