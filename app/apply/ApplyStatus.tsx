import Link from "next/link";
import { CheckCircle, Clock, XCircle, PenTool } from "lucide-react";

interface Application {
  id: string;
  status: string;
  penName: string;
  createdAt: Date;
  updatedAt: Date;
  adminNote?: string | null;
}

export default function ApplyStatus({ application }: { application: Application }) {
  const isPending = application.status === "PENDING";
  const isApproved = application.status === "APPROVED";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {isPending && (
          <>
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border)] flex items-center justify-center mx-auto mb-6">
              <Clock className="w-9 h-9 text-[var(--text-primary)]" />
            </div>
            <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider mb-2">
              กำลังรอการพิจารณา
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              ใบสมัครของ <span className="text-[var(--text-primary)] font-medium">{application.penName}</span>{" "}
              อยู่ระหว่างการพิจารณาโดยทีมงาน
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              ส่งใบสมัครเมื่อ{" "}
              {new Date(application.createdAt).toLocaleDateString("th-TH", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
            <div className="mt-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 text-sm text-[var(--text-secondary)] text-left space-y-2">
              <p className="text-[var(--text-primary)] font-medium mb-3">ขั้นตอนถัดไป</p>
              {["ทีมงานตรวจสอบใบสมัครภายใน 3-5 วันทำการ", "รับการแจ้งเตือนทางอีเมลเมื่อมีการอัปเดต", "เมื่ออนุมัติแล้ว สามารถเริ่มอัปโหลดผลงานได้ทันที"].map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {isApproved && (
          <>
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border)] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-9 h-9 text-[var(--text-primary)]" />
            </div>
            <h1 className="font-bebas text-3xl text-[var(--text-primary)] tracking-wider mb-2">
              ยินดีด้วย!
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              ใบสมัครของคุณได้รับการอนุมัติแล้ว คุณสามารถเริ่มอัปโหลดผลงานได้เลย
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bal-btn font-semibold hover:opacity-90 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              เริ่มอัปโหลดผลงาน
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
