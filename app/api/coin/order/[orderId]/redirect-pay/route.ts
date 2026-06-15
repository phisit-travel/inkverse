import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

const OMISE_API = "https://api.omise.co";

const ALLOWED_TYPES = new Set([
  "mobile_banking_kbank",
  "mobile_banking_scb",
  "mobile_banking_bbl",
  "mobile_banking_bay",
  "mobile_banking_ktb",
  "truemoney_jumpapp",
  "shopeepay_jumpapp",
]);

function omiseAuth() {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key) return null;
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

async function omiseFetch(path: string, body: Record<string, unknown>) {
  const authHeader = omiseAuth();
  if (!authHeader) return null;
  const res = await fetch(OMISE_API + path, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "Omise-Version": "2019-05-29",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return apiError("AUTH-007", 401);

  const { orderId } = await params;
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const sourceType: string = body.type ?? "";

  if (!ALLOWED_TYPES.has(sourceType))
    return apiError("VAL-001", 400, { message: "ช่องทางชำระเงินไม่ถูกต้อง" });

  const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== userId)
    return apiError("COIN-005", 404);
  if (order.status !== "PENDING")
    return apiError("VAL-003", 409, { message: "คำสั่งซื้อนี้ดำเนินการไปแล้ว" });

  if (!omiseAuth()) {
    // Sandbox: simulate redirect
    return NextResponse.json({
      authorizeUri: `${process.env.NEXTAUTH_URL}/topup/processing/${orderId}`,
      sandbox: true,
    });
  }

  try {
    const amountSatang = Math.round(order.price * 100);
    const returnUri = `${process.env.NEXTAUTH_URL}/topup/processing/${orderId}`;

    const source = await omiseFetch("/sources", {
      amount: amountSatang,
      currency: "thb",
      type: sourceType,
    });

    if (!source || source.object === "error") {
      return apiError("COIN-007", 502, { message: source?.message ?? "สร้าง source ไม่สำเร็จ" });
    }

    const charge = await omiseFetch("/charges", {
      amount: amountSatang,
      currency: "thb",
      source: source.id,
      description: `INKVERSE ${order.coins + order.bonus} coins`,
      return_uri: returnUri,
      metadata: { orderId },
    });

    if (!charge || charge.object === "error") {
      return apiError("COIN-007", 502, { message: charge?.message ?? "สร้าง charge ไม่สำเร็จ" });
    }

    await prisma.coinOrder.update({
      where: { id: orderId },
      data: {
        method: sourceType.startsWith("mobile_banking") ? "MOBILE_BANKING" : "EWALLET",
        omiseChargeId: charge.id as string,
      },
    });

    return NextResponse.json({
      authorizeUri: charge.authorize_uri as string,
      sandbox: false,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as Record<string, unknown>).message)
        : "เกิดข้อผิดพลาด กรุณาลองใหม่";
    return apiError("COIN-007", 502, { message: msg });
  }
}
