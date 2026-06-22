import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import DeliverButton from "@/components/ui/DeliverButton";
import DeleteOrderButton from "@/components/ui/DeleteOrderButton";

export const metadata: Metadata = {
  title: "บริการตรวจงาน — ออเดอร์ทั้งหมด | INKVERSE",
  robots: { index: false, follow: false },
};

type ServiceOrderRow = {
  id: string;
  quoteNo: string;
  accessToken: string;
  customerName: string;
  contact: string;
  services: string;
  words: number;
  total: number;
  deposit: number;
  balance: number;
  status: string;
  genre: string | null;
  voice: string | null;
  focus: string | null;
  briefNote: string | null;
  briefAt: Date | null;
  depositPaidAt: Date | null;
  balancePaidAt: Date | null;
  createdAt: Date;
};

const STATUS_LABEL: Record<string, string> = {
  AWAITING_DEPOSIT: "รอมัดจำ",
  IN_PROGRESS: "กำลังตรวจ",
  DELIVERED: "รอรับงาน",
  COMPLETED: "เสร็จสมบูรณ์",
  CANCELLED: "ยกเลิก",
};

export default async function ServicesDashboardPage() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    notFound();
  }

  const orders = (await prisma.serviceOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quoteNo: true,
      accessToken: true,
      customerName: true,
      contact: true,
      services: true,
      words: true,
      total: true,
      deposit: true,
      balance: true,
      status: true,
      genre: true,
      voice: true,
      focus: true,
      briefNote: true,
      briefAt: true,
      depositPaidAt: true,
      balancePaidAt: true,
      createdAt: true,
    },
  })) as ServiceOrderRow[];

  const counts: Record<string, number> = {};
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-bebas text-4xl tracking-wider text-[var(--text-primary)]">
            ออเดอร์บริการตรวจงาน
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {orders.length} ออเดอร์ทั้งหมด
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_LABEL).map(([k, label]) =>
            counts[k] ? (
              <span
                key={k}
                className="px-3 py-1 text-xs uppercase tracking-wider border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--bg-surface)]"
              >
                {label} · {counts[k]}
              </span>
            ) : null
          )}
        </div>
      </div>

      {orders.length === 0 && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-[var(--text-muted)]">ยังไม่มีออเดอร์</p>
        </div>
      )}

      {orders.length > 0 && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="text-left px-4 py-3 font-normal">เลขที่</th>
                <th className="text-left px-4 py-3 font-normal">ลูกค้า</th>
                <th className="text-left px-4 py-3 font-normal">ติดต่อ</th>
                <th className="text-left px-4 py-3 font-normal">บริการ</th>
                <th className="text-right px-4 py-3 font-normal">คำ</th>
                <th className="text-right px-4 py-3 font-normal">รวม</th>
                <th className="text-left px-4 py-3 font-normal">สถานะ</th>
                <th className="text-left px-4 py-3 font-normal">บรีฟ</th>
                <th className="text-left px-4 py-3 font-normal">วันที่</th>
                <th className="text-left px-4 py-3 font-normal">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-[var(--bg-card)] transition-colors align-top"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/order/${o.accessToken}`}
                      target="_blank"
                      className="text-[var(--text-primary)] hover:underline font-mono text-xs"
                    >
                      {o.quoteNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">
                    {o.customerName}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[140px] truncate">
                    {o.contact}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[180px]">
                    {o.services}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                    {o.words.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                    ฿{o.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {o.briefAt ? (
                      <div className="space-y-0.5">
                        {o.genre && (
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            <span className="text-[var(--text-muted)]">แนว:</span> {o.genre}
                          </p>
                        )}
                        {o.voice && (
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            <span className="text-[var(--text-muted)]">เสียง:</span> {o.voice}
                          </p>
                        )}
                        {o.focus && (
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            <span className="text-[var(--text-muted)]">เน้น:</span> {o.focus}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">ยังไม่กรอก</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {o.status === "IN_PROGRESS" && <DeliverButton token={o.accessToken} />}
                      {!o.depositPaidAt && !o.balancePaidAt && (
                        <DeleteOrderButton token={o.accessToken} />
                      )}
                      {o.status !== "IN_PROGRESS" && (o.depositPaidAt || o.balancePaidAt) && (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
