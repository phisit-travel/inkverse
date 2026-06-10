import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBankPayout, BANK_OPTIONS } from "@/lib/omise-payout";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, withdrawalEmail } from "@/lib/email";

// Earnings (TranslatorEarning.amount) are ALREADY net of the 20% platform fee
// taken at unlock time. Withdrawals therefore pay out the full available balance
// — no second cut. The translator receives exactly `amount`.
const MIN_WITHDRAW = 100; // ฿ minimum payout

const VALID_BANKS = new Set<string>(BANK_OPTIONS.map((b) => b.code));

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "TRANSLATOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const translator = await prisma.translator.findUnique({ where: { userId } });
  if (!translator) return NextResponse.json({ error: "Not a translator" }, { status: 403 });

  const requests = await prisma.withdrawalRequest.findMany({
    where: { translatorId: translator.id },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "TRANSLATOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  // Throttle: at most a few withdrawal attempts per hour per user.
  const rl = rateLimit(`withdraw:${userId}`, 5, 60 * 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "ขอถอนเงินบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );

  const [user, translator] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.translator.findUnique({ where: { userId } }),
  ]);
  if (!translator) return NextResponse.json({ error: "Not a translator" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    amount?: number;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
  };

  const amount = Number(body.amount);
  const accountName = body.accountName?.trim() ?? "";
  const accountNumber = body.accountNumber?.trim() ?? "";
  const bankCode = body.bankCode?.trim() ?? "";

  // Validation — bank transfer only (Omise cannot auto-pay PromptPay-to-phone).
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
    return NextResponse.json(
      { error: `ยอดถอนขั้นต่ำ ฿${MIN_WITHDRAW}` },
      { status: 400 }
    );
  }
  if (!accountName) return NextResponse.json({ error: "กรุณากรอกชื่อบัญชี" }, { status: 400 });
  if (!/^\d{5,20}$/.test(accountNumber))
    return NextResponse.json({ error: "เลขบัญชีไม่ถูกต้อง" }, { status: 400 });
  if (!VALID_BANKS.has(bankCode))
    return NextResponse.json({ error: "กรุณาเลือกธนาคาร" }, { status: 400 });

  // ── Atomic balance check + request creation (prevents double-withdraw race) ──
  // Serializable isolation + an in-flight guard make concurrent over-withdrawal
  // impossible: two simultaneous requests cannot both pass the balance check.
  let request;
  try {
    request = await prisma.$transaction(
      async (tx) => {
        // Block if a withdrawal is already in flight for this translator.
        const inflight = await tx.withdrawalRequest.findFirst({
          where: { translatorId: translator.id, status: { in: ["PENDING", "PROCESSING"] } },
          select: { id: true },
        });
        if (inflight) throw new Error("INFLIGHT");

        const [earningsAgg, withdrawnAgg] = await Promise.all([
          tx.translatorEarning.aggregate({
            where: { translatorId: translator.id },
            _sum: { amount: true },
          }),
          tx.withdrawalRequest.aggregate({
            where: { translatorId: translator.id, status: { notIn: ["REJECTED", "FAILED"] } },
            _sum: { amount: true },
          }),
        ]);
        const available = (earningsAgg._sum.amount ?? 0) - (withdrawnAgg._sum.amount ?? 0);
        if (amount > available + 0.001) throw new Error("INSUFFICIENT");

        return tx.withdrawalRequest.create({
          data: {
            translatorId: translator.id,
            amount,
            paymentMethod: "BANK_TRANSFER",
            accountName,
            accountNumber,
            bankName: body.bankName?.trim() ?? null,
            bankCode,
            status: "PENDING",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "INFLIGHT")
      return NextResponse.json({ error: "มีคำขอถอนที่กำลังดำเนินการอยู่แล้ว" }, { status: 409 });
    if (msg === "INSUFFICIENT")
      return NextResponse.json({ error: "ยอดเงินคงเหลือไม่เพียงพอ" }, { status: 400 });
    // Serialization conflict (P2034) or other transient error → ask to retry.
    return NextResponse.json({ error: "ระบบไม่ว่าง กรุณาลองใหม่อีกครั้ง" }, { status: 409 });
  }

  // Email acknowledgement (best-effort).
  if (user?.email)
    await sendEmail({
      to: user.email,
      subject: "รับคำขอถอนเงิน INKVERSE",
      html: withdrawalEmail({ amount, status: "submitted" }),
    });

  // ── Auto-payout via Omise bank transfer (network call OUTSIDE the tx) ──
  if (process.env.OMISE_SECRET_KEY) {
    try {
      const result = await createBankPayout({
        name: translator.penName,
        email: user?.email ?? `${userId}@inkverse.io`,
        bankCode,
        accountNumber,
        accountName,
        amountTHB: amount, // full balance — fee already taken at unlock
        metadata: { withdrawalId: request.id, translatorId: translator.id },
      });

      if (result.success) {
        await prisma.withdrawalRequest.update({
          where: { id: request.id },
          data: {
            status: "PROCESSING",
            omiseRecipientId: result.recipientId,
            omiseTransferId: result.transferId,
          },
        });
        return NextResponse.json({ ok: true, id: request.id, auto: true, amount });
      }
      await prisma.withdrawalRequest.update({
        where: { id: request.id },
        data: { adminNote: `Auto-payout failed: ${result.error}` },
      });
    } catch (err) {
      const m = err instanceof Error ? err.message : "Auto-payout error";
      await prisma.withdrawalRequest.update({
        where: { id: request.id },
        data: { adminNote: `Auto-payout error: ${m}` },
      });
    }
  }

  // Payout not configured or failed → stays PENDING for manual admin processing.
  return NextResponse.json({ ok: true, id: request.id, auto: false, amount });
}
