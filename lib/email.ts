// Transactional email via Resend's REST API (no SDK dependency).
// Fully graceful: if RESEND_API_KEY is unset, it logs and no-ops so flows that
// "send an email" never break in dev / before email is configured.

import type { Quote } from "@/lib/services/pricing";

const FROM = process.env.EMAIL_FROM || "INKVERSE <noreply@inksverse.com>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:skipped] no RESEND_API_KEY → would send "${opts.subject}" to ${opts.to}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error("[email:failed]", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email:error]", err);
    return false;
  }
}

// Minimal monochrome (Balenciaga) email shell.
function shell(title: string, body: string): string {
  return `<div style="background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;padding:40px 24px">
  <div style="max-width:480px;margin:0 auto;border:1px solid #2a2a2a;padding:32px">
    <p style="letter-spacing:.3em;font-size:12px;color:#888;text-transform:uppercase;margin:0 0 24px">INKVERSE</p>
    <h1 style="font-size:22px;margin:0 0 16px;text-transform:uppercase;letter-spacing:.04em">${title}</h1>
    <div style="font-size:14px;line-height:1.7;color:#ccc">${body}</div>
  </div>
  <p style="text-align:center;color:#555;font-size:11px;margin-top:24px">© INKVERSE</p>
</div>`;
}

// Escape user/admin-supplied text before embedding it in email HTML.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Admin's reply to a contact/support message, emailed back to the sender.
export function contactReplyEmail(opts: { name: string; original: string; reply: string }) {
  return shell(
    "ตอบกลับจากทีมงาน",
    `<p>สวัสดีคุณ ${esc(opts.name)}</p>
     <p>ทีมงาน INKVERSE ได้ตอบกลับข้อความที่คุณส่งมาแล้ว:</p>
     <div style="border-left:3px solid #fff;padding:6px 16px;margin:18px 0;color:#fff;white-space:pre-wrap">${esc(opts.reply)}</div>
     <p style="color:#777;font-size:12px;margin-top:24px">— ข้อความเดิมของคุณ —</p>
     <p style="color:#777;font-size:12px;white-space:pre-wrap">${esc(opts.original)}</p>
     <p style="color:#777;font-size:12px;margin-top:20px">หากต้องการสอบถามเพิ่มเติม ส่งข้อความผ่านหน้า "ติดต่อเรา" บนเว็บไซต์ได้เลย</p>`
  );
}

export function passwordResetEmail(resetUrl: string) {
  return shell(
    "รีเซ็ตรหัสผ่าน",
    `<p>มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ คลิกลิงก์ด้านล่างเพื่อตั้งรหัสใหม่ (ลิงก์หมดอายุใน 1 ชั่วโมง)</p>
     <p style="margin:24px 0"><a href="${resetUrl}" style="background:#fff;color:#000;text-decoration:none;padding:12px 24px;text-transform:uppercase;letter-spacing:.1em;font-weight:bold;font-size:13px">ตั้งรหัสผ่านใหม่</a></p>
     <p style="color:#888;font-size:12px">ถ้าคุณไม่ได้ขอ สามารถละเว้นอีเมลนี้ได้</p>`
  );
}

export function verificationEmail(verifyUrl: string) {
  return shell(
    "ยืนยันอีเมล",
    `<p>ขอบคุณที่สมัคร INKVERSE! คลิกปุ่มด้านล่างเพื่อยืนยันอีเมล แล้วรับ 20 เหรียญต้อนรับทันที (ลิงก์หมดอายุใน 24 ชั่วโมง)</p>
     <p style="margin:24px 0"><a href="${verifyUrl}" style="background:#fff;color:#000;text-decoration:none;padding:12px 24px;text-transform:uppercase;letter-spacing:.1em;font-weight:bold;font-size:13px">ยืนยันอีเมล</a></p>
     <p style="color:#888;font-size:12px">ถ้าคุณไม่ได้สมัคร สามารถละเว้นอีเมลนี้ได้</p>`
  );
}

export function passwordResetOtpEmail(otp: string) {
  return shell(
    "รหัส OTP รีเซ็ตรหัสผ่าน",
    `<p>ใช้รหัสนี้เพื่อยืนยันการตั้งรหัสผ่านใหม่ (หมดอายุใน 10 นาที)</p>
     <p style="margin:24px 0;font-size:38px;font-weight:bold;letter-spacing:.35em;color:#fff">${otp}</p>
     <p style="color:#888;font-size:12px">ถ้าคุณไม่ได้ขอ สามารถละเว้นอีเมลนี้ได้</p>`
  );
}

export function topupReceiptEmail(coins: number, priceTHB: number) {
  return shell(
    "ใบเสร็จเติมเหรียญ",
    `<p>เติมเหรียญสำเร็จ ขอบคุณที่สนับสนุน INKVERSE</p>
     <p style="margin:20px 0;font-size:28px;font-weight:bold">${coins.toLocaleString()} เหรียญ</p>
     <p style="color:#888">ยอดชำระ ฿${priceTHB.toFixed(2)}</p>`
  );
}

export function withdrawalEmail(opts: { amount: number; status: "submitted" | "paid" }) {
  const isPaid = opts.status === "paid";
  return shell(
    isPaid ? "โอนเงินสำเร็จ" : "รับคำขอถอนเงิน",
    `<p>${isPaid ? "ระบบได้โอนเงินเข้าบัญชีของคุณเรียบร้อยแล้ว" : "เราได้รับคำขอถอนเงินของคุณแล้ว และกำลังดำเนินการ"}</p>
     <p style="margin:20px 0;font-size:28px;font-weight:bold">฿${opts.amount.toFixed(2)}</p>`
  );
}

// Admin-facing: a new "ขอใบเสนอราคา" from the /services page, with the
// auto-computed quote breakdown so the owner can confirm at a glance.
export function serviceQuoteEmail(opts: {
  name: string;
  contact: string;
  quote: Quote;
  quoteNo: string;
  date: string;
  excerpt: string;
  message: string;
}) {
  const row = (k: string, v: string) =>
    `<p style="margin:6px 0"><span style="color:#888">${esc(k)}:</span> <span style="color:#fff">${esc(v)}</span></p>`;
  const q = opts.quote;
  const lineRows = q.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;color:#fff">${esc(l.service)}</td>
         <td style="padding:6px 0;text-align:right;color:#aaa">${l.words.toLocaleString()} คำ</td>
         <td style="padding:6px 0;text-align:right;color:#fff">฿${l.amount.toLocaleString()}</td></tr>`
    )
    .join("");
  return shell(
    `ใบเสนอราคา ${esc(opts.quoteNo)}`,
    `<p>มีคำขอใบเสนอราคาบริการเข้ามาใหม่ (${esc(opts.date)}):</p>
     <div style="border:1px solid #2a2a2a;padding:16px;margin:18px 0">
       ${row("ชื่อ", opts.name)}
       ${row("ช่องทางติดต่อ", opts.contact)}
       ${row("ปริมาณงาน", `${q.words.toLocaleString()} คำ${q.freeWords ? ` (ฟรีลูกค้าใหม่ ${q.freeWords.toLocaleString()} คำ)` : ""}`)}
     </div>
     <table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0">
       ${lineRows || `<tr><td style="color:#888;padding:6px 0">ยังไม่ระบุปริมาณคำ — ต้องประเมินเอง</td></tr>`}
       <tr><td style="border-top:1px solid #fff;padding:10px 0;color:#888;text-transform:uppercase;letter-spacing:.1em;font-size:12px">รวมประเมิน</td>
       <td style="border-top:1px solid #fff"></td>
       <td style="border-top:1px solid #fff;padding:10px 0;text-align:right;color:#fff;font-size:20px;font-weight:bold">฿${q.total.toLocaleString()}</td></tr>
     </table>
     ${q.total > 0 ? `<div style="border:1px solid #2a2a2a;padding:12px 16px;margin:4px 0 8px">
       <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.1em">การชำระเงิน</p>
       <p style="margin:3px 0;color:#ccc">มัดจำ 40% (ก่อนเริ่มงาน): <span style="color:#fff;font-weight:bold">฿${q.deposit.toLocaleString()}</span></p>
       <p style="margin:3px 0;color:#ccc">คงเหลือ 60% (เมื่อส่งมอบ): <span style="color:#fff;font-weight:bold">฿${q.balance.toLocaleString()}</span></p>
     </div>` : ""}
     ${opts.excerpt ? `<p style="color:#888;font-size:12px;margin-top:16px">ตัวอย่างต้นฉบับ:</p><p style="white-space:pre-wrap;color:#bbb;font-size:13px;border-left:3px solid #2a2a2a;padding-left:12px">${esc(opts.excerpt)}…</p>` : ""}
     ${opts.message ? `<p style="color:#888;font-size:12px;margin-top:16px">หมายเหตุ/ลิงก์:</p><p style="white-space:pre-wrap;color:#ccc">${esc(opts.message)}</p>` : ""}`
  );
}

// Admin-facing: a confirmed editorial-services ORDER was just placed (the
// customer committed to the quote). Shows the full breakdown + brief so the
// owner can start prepping the job. money: amounts are server-derived.
export function serviceOrderEmail(opts: {
  quoteNo: string;
  customerName: string;
  contact: string;
  services: string;
  words: number;
  total: number;
  deposit: number;
  balance: number;
  briefNote?: string | null;
}) {
  const row = (k: string, v: string) =>
    `<p style="margin:6px 0"><span style="color:#888">${esc(k)}:</span> <span style="color:#fff">${esc(v)}</span></p>`;
  return shell(
    `ออเดอร์ใหม่ ${esc(opts.quoteNo)}`,
    `<p>มีออเดอร์บริการเข้ามาใหม่ (ลูกค้ายืนยันใบเสนอราคาแล้ว):</p>
     <div style="border:1px solid #2a2a2a;padding:16px;margin:18px 0">
       ${row("ชื่อ", opts.customerName)}
       ${row("ช่องทางติดต่อ", opts.contact)}
       ${row("บริการ", opts.services || "-")}
       ${row("ปริมาณงาน", `${opts.words.toLocaleString()} คำ`)}
     </div>
     <div style="border:1px solid #2a2a2a;padding:12px 16px;margin:4px 0 8px">
       <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.1em">การชำระเงิน</p>
       <p style="margin:3px 0;color:#ccc">ยอดรวม: <span style="color:#fff;font-weight:bold">฿${opts.total.toLocaleString()}</span></p>
       <p style="margin:3px 0;color:#ccc">มัดจำ (ก่อนเริ่มงาน): <span style="color:#fff;font-weight:bold">฿${opts.deposit.toLocaleString()}</span></p>
       <p style="margin:3px 0;color:#ccc">คงเหลือ (เมื่อส่งมอบ): <span style="color:#fff;font-weight:bold">฿${opts.balance.toLocaleString()}</span></p>
     </div>
     ${opts.briefNote ? `<p style="color:#888;font-size:12px;margin-top:16px">บรีฟ/หมายเหตุจากลูกค้า:</p><p style="white-space:pre-wrap;color:#ccc">${esc(opts.briefNote)}</p>` : ""}`
  );
}

// Admin-facing: a customer just paid the deposit or the balance for an order.
export function servicePaymentEmail(opts: {
  quoteNo: string;
  phaseLabel: string; // "มัดจำ" | "ส่วนที่เหลือ"
  amount: number;
  customerName: string;
}) {
  return shell(
    `รับชำระ${esc(opts.phaseLabel)} ${esc(opts.quoteNo)}`,
    `<p>ลูกค้าชำระ${esc(opts.phaseLabel)}เรียบร้อยแล้ว</p>
     <p style="margin:6px 0;color:#888">ออเดอร์: <span style="color:#fff">${esc(opts.quoteNo)}</span> · ${esc(opts.customerName)}</p>
     <p style="margin:20px 0;font-size:28px;font-weight:bold">฿${opts.amount.toLocaleString()}</p>`
  );
}
