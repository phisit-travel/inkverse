// Editorial-services order lifecycle + money-safe payment application.
//
// Money invariants (mirrors the coin-order flow):
//  - All amounts are server-computed from lib/services/pricing (never trusted
//    from the client).
//  - Each payment is confirmed by a verified EasySlip slip; the slip transRef is
//    stored in a @unique column so the same slip can't be reused.
//  - Status flips use a CONDITIONAL updateMany (guarded on the expected current
//    status) so concurrent verifications can't double-apply.
//
// Status: AWAITING_DEPOSIT → IN_PROGRESS → DELIVERED → COMPLETED  (+ CANCELLED)

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { computeQuote } from "@/lib/services/pricing";
import type { ServiceOrder } from "@prisma/client";

function accessToken(): string {
  return randomBytes(24).toString("base64url");
}

function quoteNumber(d: Date): string {
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  return `IV-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createServiceOrder(input: {
  name: string;
  contact: string;
  services: string[];
  newCustomer: boolean;
  words: number;
  userId?: string | null;
  briefNote?: string;
}): Promise<ServiceOrder> {
  // Authoritative quote — recomputed here, never taken from the client.
  const q = computeQuote({ words: input.words, services: input.services, newCustomer: input.newCustomer });

  // quoteNo is @unique; collisions are astronomically unlikely (24-bit hex per
  // day) but retry once just in case.
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.serviceOrder.create({
        data: {
          quoteNo: quoteNumber(new Date()),
          accessToken: accessToken(),
          userId: input.userId ?? null,
          customerName: input.name.slice(0, 120),
          contact: input.contact.slice(0, 200),
          services: input.services.join(", ").slice(0, 300),
          words: q.words,
          newCustomer: q.newCustomer,
          total: q.total,
          deposit: q.deposit,
          balance: q.balance,
          briefNote: input.briefNote?.slice(0, 4000) || null,
          // A fully-free job (e.g. all within the new-customer 2,500 words) has
          // no deposit — skip straight to work so it isn't stuck awaiting a ฿0 slip.
          status: q.deposit > 0 ? "AWAITING_DEPOSIT" : "IN_PROGRESS",
          depositPaidAt: q.deposit > 0 ? null : new Date(),
        },
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002" && attempt < 2) continue; // quoteNo/token clash — retry
      throw err;
    }
  }
}

export async function getOrderByToken(token: string): Promise<ServiceOrder | null> {
  if (!token || token.length < 16) return null;
  return prisma.serviceOrder.findUnique({ where: { accessToken: token } });
}

export type PaymentPhase = "deposit" | "balance";

// Which payment (if any) is currently due, and for how much.
export function paymentDue(order: ServiceOrder): { phase: PaymentPhase; amount: number } | null {
  // amount > 0 guard: a ฿0 phase (fully-free job) has nothing to pay.
  if (order.status === "AWAITING_DEPOSIT" && !order.depositPaidAt && order.deposit > 0) {
    return { phase: "deposit", amount: order.deposit };
  }
  if (order.status === "DELIVERED" && !order.balancePaidAt && order.balance > 0) {
    return { phase: "balance", amount: order.balance };
  }
  return null;
}

// Atomically record a verified payment. Returns false if another request already
// applied it (so the caller must NOT re-notify / double-count). Throws P2002 if
// the slip ref was already used on another order (caught by the route).
export async function applyVerifiedPayment(
  orderId: string,
  phase: PaymentPhase,
  slipRef: string,
  slipUrl: string | null
): Promise<boolean> {
  if (phase === "deposit") {
    const r = await prisma.serviceOrder.updateMany({
      where: { id: orderId, status: "AWAITING_DEPOSIT", depositPaidAt: null },
      data: { status: "IN_PROGRESS", depositPaidAt: new Date(), depositSlipRef: slipRef, depositSlipUrl: slipUrl },
    });
    return r.count > 0;
  }
  const r = await prisma.serviceOrder.updateMany({
    where: { id: orderId, status: "DELIVERED", balancePaidAt: null },
    data: { status: "COMPLETED", balancePaidAt: new Date(), balanceSlipRef: slipRef, balanceSlipUrl: slipUrl },
  });
  return r.count > 0;
}

// Customer-safe view — never leak internal notes or the other party's slip refs.
export function publicOrderView(o: ServiceOrder) {
  return {
    quoteNo: o.quoteNo,
    customerName: o.customerName,
    contact: o.contact,
    services: o.services,
    words: o.words,
    total: o.total,
    deposit: o.deposit,
    balance: o.balance,
    status: o.status,
    genre: o.genre,
    voice: o.voice,
    focus: o.focus,
    briefNote: o.briefNote,
    briefAt: o.briefAt,
    depositPaidAt: o.depositPaidAt,
    balancePaidAt: o.balancePaidAt,
    deliveredAt: o.deliveredAt,
    deliveryNote: o.deliveryNote,
    // The final file link is only revealed once the balance is paid.
    deliveryUrl: o.status === "COMPLETED" ? o.deliveryUrl : null,
    createdAt: o.createdAt,
  };
}
