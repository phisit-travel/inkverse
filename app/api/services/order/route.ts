import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, serviceOrderEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/apiError";
import { createServiceOrder } from "@/lib/services/orders";
import { baht } from "@/lib/services/pricing";

// Confirmed editorial-services ORDER intake (the customer committed to the
// quote). Creates the ServiceOrder (authoritative price recomputed server-side
// in createServiceOrder — never trusted from the client), emails the owner, and
// returns the access token the customer uses to manage/pay for the order.
const RECIPIENT = process.env.SERVICES_QUOTE_EMAIL || "madarotsa@gmail.com";

export async function POST(req: NextRequest) {
  if (!rateLimit(`svcorder:${clientIp(req)}`, 5, 60_000).ok) {
    return apiError("RATE-001", 429, { message: "ส่งคำขอบ่อยเกินไป ลองใหม่อีกครั้งในอีกสักครู่" });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    contact?: string;
    services?: string[];
    newCustomer?: boolean;
    words?: number;
    message?: string;
  };

  const name = (body.name || "").trim().slice(0, 120);
  const contact = (body.contact || "").trim().slice(0, 200);
  const services = Array.isArray(body.services)
    ? body.services.filter((s) => typeof s === "string").slice(0, 5)
    : [];
  const newCustomer = body.newCustomer !== false;
  const words = Math.max(0, Math.min(5_000_000, Math.round(Number(body.words) || 0)));
  const message = (body.message || "").trim().slice(0, 4000);

  if (!name || !contact) {
    return apiError("VAL-001", 400, { message: "กรุณากรอกชื่อและช่องทางติดต่อ" });
  }

  // Attach the logged-in user if any (orders can be placed anonymously too).
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const order = await createServiceOrder({
    name,
    contact,
    services,
    newCustomer,
    words,
    userId,
    briefNote: message,
  });

  const sent = await sendEmail({
    to: RECIPIENT,
    subject: `ออเดอร์ใหม่ ${order.quoteNo} — ${name} · ${baht(order.total)}`,
    html: serviceOrderEmail({
      quoteNo: order.quoteNo,
      customerName: order.customerName,
      contact: order.contact,
      services: order.services,
      words: order.words,
      total: order.total,
      deposit: order.deposit,
      balance: order.balance,
      briefNote: order.briefNote,
    }),
  });
  console.log(
    `[services:order] ${order.quoteNo} from="${name}" contact="${contact}" services="${order.services}" words=${order.words} total=${order.total} deposit=${order.deposit} new=${newCustomer} userId=${userId ?? "-"} emailed=${sent}`
  );

  return NextResponse.json({ ok: true, token: order.accessToken, quoteNo: order.quoteNo });
}
