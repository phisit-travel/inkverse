import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reviewVerification } from "@/lib/coins";
import { createNotification } from "@/lib/notifications";
import { apiError } from "@/lib/apiError";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN")
    return apiError("AUTH-008", 403);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const approve = body?.action === "approve";
  const note = typeof body?.note === "string" ? body.note : undefined;

  const userId = await reviewVerification(id, approve, note);
  if (!userId)
    return apiError("VAL-002", 404, { message: "ไม่พบคำขอ หรือดำเนินการไปแล้ว" });

  await createNotification({
    userId,
    type: approve ? "VERIFY_APPROVED" : "VERIFY_REJECTED",
    title: approve ? "ยืนยันตัวตนสำเร็จ" : "คำขอยืนยันตัวตนไม่ผ่าน",
    body: approve
      ? "บัญชีของคุณได้รับเครื่องหมายยืนยันแล้ว 🎉"
      : "คำขอไม่ผ่านการตรวจสอบ ระบบได้คืนค่าธรรมเนียมให้แล้ว",
    link: `/profile`,
  });

  return NextResponse.json({ ok: true });
}
