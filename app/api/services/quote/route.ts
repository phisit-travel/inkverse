import { NextRequest, NextResponse } from "next/server";
import { sendEmail, serviceQuoteEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";

// Public "ขอใบเสนอราคา" intake for the /services page. Lean v1: emails the owner
// (SERVICES_QUOTE_EMAIL) — no DB table yet. Set RESEND_API_KEY + the recipient
// env in prod for delivery; sendEmail no-ops gracefully otherwise.
const RECIPIENT = process.env.SERVICES_QUOTE_EMAIL || "madarotsa@gmail.com";

export async function POST(req: NextRequest) {
  if (!rateLimit(`quote:${clientIp(req)}`, 5, 60_000).ok) {
    return apiError("RATE-001", 429, { message: "ส่งคำขอบ่อยเกินไป ลองใหม่อีกครั้งในอีกสักครู่" });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    contact?: string;
    services?: string[];
    wordCount?: string;
    message?: string;
  };

  const name = (body.name || "").trim().slice(0, 120);
  const contact = (body.contact || "").trim().slice(0, 200);
  const services = Array.isArray(body.services)
    ? body.services.filter((s) => typeof s === "string").slice(0, 5).join(", ")
    : "";
  const wordCount = (body.wordCount || "").toString().trim().slice(0, 40);
  const message = (body.message || "").trim().slice(0, 4000);

  if (!name || !contact) {
    return apiError("VAL-001", 400, { message: "กรุณากรอกชื่อและช่องทางติดต่อ" });
  }

  const sent = await sendEmail({
    to: RECIPIENT,
    subject: `ขอใบเสนอราคา — ${name}`,
    html: serviceQuoteEmail({ name, contact, services: services || "-", wordCount, message }),
  });
  // Always log so a lead is never lost even if email is unconfigured.
  console.log(`[services:quote] from="${name}" contact="${contact}" services="${services}" words="${wordCount}" emailed=${sent}`);

  return NextResponse.json({ ok: true });
}
