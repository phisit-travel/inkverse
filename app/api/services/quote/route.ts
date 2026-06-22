import { NextRequest, NextResponse } from "next/server";
import { sendEmail, serviceQuoteEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";
import { computeQuote, baht } from "@/lib/services/pricing";

// Public "ขอใบเสนอราคา" intake for the /services page. Computes the quote
// server-side from the rate card (the client preview is mirror-only), emails the
// owner the breakdown, and returns the quote so the customer sees it instantly.
// Lean v1: no DB table — emails + logs the lead. Set RESEND_API_KEY +
// SERVICES_QUOTE_EMAIL in prod for delivery; sendEmail no-ops gracefully.
const RECIPIENT = process.env.SERVICES_QUOTE_EMAIL || "madarotsa@gmail.com";

function quoteNumber(d: Date): string {
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `IV-${ymd}-${rand}`;
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`quote:${clientIp(req)}`, 5, 60_000).ok) {
    return apiError("RATE-001", 429, { message: "ส่งคำขอบ่อยเกินไป ลองใหม่อีกครั้งในอีกสักครู่" });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    contact?: string;
    services?: string[];
    newCustomer?: boolean;
    words?: number;
    excerpt?: string;
    message?: string;
  };

  const name = (body.name || "").trim().slice(0, 120);
  const contact = (body.contact || "").trim().slice(0, 200);
  const services = Array.isArray(body.services)
    ? body.services.filter((s) => typeof s === "string").slice(0, 5)
    : [];
  const newCustomer = body.newCustomer !== false;
  const words = Math.max(0, Math.min(5_000_000, Math.round(Number(body.words) || 0)));
  const excerpt = (body.excerpt || "").trim().slice(0, 300);
  const message = (body.message || "").trim().slice(0, 4000);

  if (!name || !contact) {
    return apiError("VAL-001", 400, { message: "กรุณากรอกชื่อและช่องทางติดต่อ" });
  }

  // Authoritative price — never trust a client-sent amount.
  const quote = computeQuote({ words, services, newCustomer });

  const now = new Date();
  const quoteNo = quoteNumber(now);
  const date = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  const sent = await sendEmail({
    to: RECIPIENT,
    subject: `ขอใบเสนอราคา ${quoteNo} — ${name} · ${baht(quote.total)}`,
    html: serviceQuoteEmail({ name, contact, quote, quoteNo, date, excerpt, message }),
  });
  console.log(
    `[services:quote] ${quoteNo} from="${name}" contact="${contact}" services="${services.join(", ")}" words=${words} total=${quote.total} new=${newCustomer} emailed=${sent}`
  );

  return NextResponse.json({ ok: true, quote, quoteNo, date });
}
