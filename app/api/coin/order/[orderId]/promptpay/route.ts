import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OMISE_API = "https://api.omise.co";

function omiseAuth() {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key) return null;
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

async function omiseFetch(path: string, body: Record<string, unknown>) {
  const auth = omiseAuth();
  if (!auth) return null;
  const res = await fetch(OMISE_API + path, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      "Omise-Version": "2019-05-29",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const userId = (session.user as { id: string }).id;
  const order = await prisma.coinOrder.findUnique({ where: { id: orderId } });

  if (!order || order.userId !== userId)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING")
    return NextResponse.json({ error: "Order already processed" }, { status: 409 });

  // Sandbox — no Omise keys
  if (!omiseAuth()) {
    return NextResponse.json({ qrProxyUrl: null, sandbox: true });
  }

  try {
    const amountSatang = Math.round(order.price * 100);

    const source = await omiseFetch("/sources", {
      amount: amountSatang,
      currency: "thb",
      type: "promptpay",
    });

    if (source.object === "error") {
      return NextResponse.json({ error: source.message }, { status: 502 });
    }

    const charge = await omiseFetch("/charges", {
      amount: amountSatang,
      currency: "thb",
      source: source.id,
      description: `INKVERSE ${order.coins + order.bonus} coins`,
      metadata: { orderId },
    });

    if (charge.object === "error") {
      return NextResponse.json({ error: charge.message }, { status: 502 });
    }

    await prisma.coinOrder.update({
      where: { id: orderId },
      data: { method: "PROMPTPAY", omiseChargeId: charge.id as string },
    });

    return NextResponse.json({
      qrProxyUrl: `/api/coin/order/${orderId}/qr`,
      sandbox: false,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as Record<string, unknown>).message)
        : "เกิดข้อผิดพลาด กรุณาลองใหม่";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
