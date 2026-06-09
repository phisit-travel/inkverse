import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    action?: "approve" | "paid" | "reject";
    adminNote?: string;
  };

  const { action, adminNote } = body;
  if (!action || !["approve", "paid", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { translator: { select: { userId: true } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const statusMap = { approve: "APPROVED", paid: "PAID", reject: "REJECTED" } as const;
  const newStatus = statusMap[action];

  const updated = await prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status: newStatus,
      adminNote: adminNote?.trim() || null,
      processedAt: new Date(),
    },
  });

  const userId = request.translator.userId;
  const amount = `฿${request.amount.toFixed(2)}`;

  if (action === "approve") {
    await createNotification({
      userId,
      type: "WITHDRAWAL_APPROVED",
      title: "คำขอถอนเงินได้รับการอนุมัติ",
      body: `คำขอถอนเงิน ${amount} ของคุณได้รับการอนุมัติและอยู่ระหว่างการโอน`,
      link: "/dashboard",
    });
  } else if (action === "paid") {
    await createNotification({
      userId,
      type: "WITHDRAWAL_PAID",
      title: "โอนเงินเรียบร้อยแล้ว",
      body: `ยอดเงิน ${amount} ถูกโอนเข้าบัญชีของคุณเรียบร้อยแล้ว`,
      link: "/dashboard",
    });
  } else if (action === "reject") {
    const note = adminNote?.trim() || "ไม่สามารถดำเนินการได้";
    await createNotification({
      userId,
      type: "WITHDRAWAL_REJECTED",
      title: "คำขอถอนเงินถูกปฏิเสธ",
      body: note,
      link: "/dashboard",
    });
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
