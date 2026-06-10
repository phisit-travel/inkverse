import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReviewRow from "./ReviewRow";
import { BadgeCheck } from "lucide-react";

export const metadata = { title: "คำขอยืนยันตัวตน" };

export default async function AdminVerificationsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  const requests = await prisma.verificationRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { user: { select: { username: true, translator: { select: { penName: true } } } } },
  });
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-1">
        <BadgeCheck className="w-7 h-7 text-[var(--text-primary)]" />
        <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider">
          คำขอยืนยันตัวตน
        </h1>
      </div>
      <p className="text-[var(--text-secondary)] text-sm mb-8">
        รอตรวจสอบ {pendingCount} · ทั้งหมด {requests.length}
      </p>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)] text-sm">
          ยังไม่มีคำขอ
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <ReviewRow
              key={r.id}
              req={{
                id: r.id,
                username: r.user.username,
                penName: r.user.translator?.penName ?? null,
                status: r.status,
                coinsPaid: r.coinsPaid,
                createdAt: r.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
