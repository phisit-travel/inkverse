"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  Download,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { baht } from "@/lib/services/pricing";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status =
  | "AWAITING_DEPOSIT"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderView {
  quoteNo: string;
  customerName: string;
  contact: string;
  services: string;
  words: number;
  total: number;
  deposit: number;
  balance: number;
  status: Status;
  genre: string | null;
  voice: string | null;
  focus: string | null;
  briefNote: string | null;
  briefAt: Date | string | null;
  depositPaidAt: Date | string | null;
  balancePaidAt: Date | string | null;
  deliveredAt: Date | string | null;
  deliveryNote: string | null;
  deliveryUrl: string | null;
  createdAt: Date | string;
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS: { label: string; statuses: Status[] }[] = [
  { label: "รับงาน", statuses: ["AWAITING_DEPOSIT", "IN_PROGRESS", "DELIVERED", "COMPLETED"] },
  { label: "มัดจำ", statuses: ["IN_PROGRESS", "DELIVERED", "COMPLETED"] },
  { label: "กำลังตรวจ", statuses: ["IN_PROGRESS", "DELIVERED", "COMPLETED"] },
  { label: "ส่งมอบ", statuses: ["DELIVERED", "COMPLETED"] },
  { label: "เสร็จสมบูรณ์", statuses: ["COMPLETED"] },
];

function Stepper({ status }: { status: Status }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <XCircle className="w-4 h-4 shrink-0" />
        ออเดอร์นี้ถูกยกเลิก
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {STEPS.map((step, i) => {
        const done = step.statuses.includes(status);
        const active =
          (status === "AWAITING_DEPOSIT" && i === 0) ||
          (status === "IN_PROGRESS" && (i === 1 || i === 2)) ||
          (status === "DELIVERED" && i === 3) ||
          (status === "COMPLETED" && i === 4);

        return (
          <div key={step.label} className="flex items-center min-w-0">
            <div className="flex flex-col items-center gap-1 px-2 sm:px-3 py-1 shrink-0">
              <div
                className={`w-6 h-6 flex items-center justify-center border text-xs font-semibold transition-colors ${
                  done
                    ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-primary)]"
                    : "border-[var(--border)] text-[var(--text-muted)]"
                } ${active ? "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]" : ""}`}
              >
                {done ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider whitespace-nowrap ${
                  done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 sm:w-8 shrink-0 mt-[-14px] ${
                  STEPS[i + 1].statuses.includes(status)
                    ? "bg-[var(--text-primary)]"
                    : "bg-[var(--border)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Creative Brief ───────────────────────────────────────────────────────────

const VOICE_OPTIONS = ["เป็นทางการ", "สบายๆ", "กวีนิพนธ์", "อื่นๆ"];

function BriefForm({
  token,
  order,
  onSaved,
}: {
  token: string;
  order: OrderView;
  onSaved: () => void;
}) {
  const [genre, setGenre] = useState(order.genre ?? "");
  const [voices, setVoices] = useState<string[]>(
    order.voice ? order.voice.split(",").map((v) => v.trim()).filter(Boolean) : []
  );
  const [otherVoice, setOtherVoice] = useState(() => {
    if (!order.voice) return "";
    const parts = order.voice.split(",").map((v) => v.trim());
    return parts.find((v) => !VOICE_OPTIONS.slice(0, 3).includes(v)) ?? "";
  });
  const [focus, setFocus] = useState(order.focus ?? "");
  const [briefNote, setBriefNote] = useState(order.briefNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!order.briefAt);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!order.briefAt);

  function toggleVoice(v: string) {
    setVoices((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
    setSaved(false);
  }

  const field =
    "w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors";
  const label =
    "block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5";

  async function save() {
    setSaving(true);
    setError("");
    const allVoices = [
      ...voices.filter((v) => v !== "อื่นๆ"),
      ...(voices.includes("อื่นๆ") && otherVoice.trim() ? [otherVoice.trim()] : []),
    ];
    try {
      const res = await fetch(`/api/services/order/${token}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: genre.trim() || null,
          voice: allVoices.join(", ") || null,
          focus: focus.trim() || null,
          briefNote: briefNote.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setSaved(true);
      onSaved();
    } catch {
      setError("เครือข่ายขัดข้อง กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  const disabled = order.status === "COMPLETED" || order.status === "CANCELLED";

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div>
          <p className="eyebrow mb-0.5">ข้อมูลงาน</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {saved ? "บันทึกแล้ว · แก้ไขได้ตลอดเวลา" : "ก่อนเริ่มตรวจ ขอทราบรายละเอียดงานหน่อยนะครับ"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <Check className="w-4 h-4 text-[var(--text-primary)]" />}
          {open ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-5 space-y-4">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            ข้อมูลเหล่านี้ช่วยให้ทีมบรรณาธิการเข้าใจงานของคุณและรักษาสำนวนได้ตรงกับเจตนา
          </p>

          <div>
            <label className={label}>แนวนิยาย</label>
            <input
              className={field}
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setSaved(false); }}
              placeholder="เช่น โรแมนซ์ แฟนตาซี สืบสวน ไทยย้อนยุค"
              disabled={disabled}
            />
          </div>

          <div>
            <label className={label}>น้ำเสียง / สไตล์</label>
            <div className="flex flex-wrap gap-2">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => { toggleVoice(v); }}
                  className={`px-3 py-1.5 text-sm border transition-colors ${
                    voices.includes(v)
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {v}
                </button>
              ))}
            </div>
            {voices.includes("อื่นๆ") && (
              <input
                className={`${field} mt-2`}
                value={otherVoice}
                onChange={(e) => { setOtherVoice(e.target.value); setSaved(false); }}
                placeholder="ระบุน้ำเสียงที่ต้องการ"
                disabled={disabled}
              />
            )}
          </div>

          <div>
            <label className={label}>จุดเน้น</label>
            <textarea
              className={`${field} min-h-[90px] resize-y`}
              value={focus}
              onChange={(e) => { setFocus(e.target.value); setSaved(false); }}
              placeholder="อยากให้เน้นตรวจอะไรเป็นพิเศษไหม เช่น คำราชาศัพท์ ความสม่ำเสมอของชื่อตัวละคร สำนวนโบราณ"
              disabled={disabled}
            />
          </div>

          <div>
            <label className={label}>ลิงก์ต้นฉบับ / หมายเหตุ (ถ้ามี)</label>
            <input
              className={field}
              value={briefNote}
              onChange={(e) => { setBriefNote(e.target.value); setSaved(false); }}
              placeholder="ลิงก์ Google Doc หรือหมายเหตุเพิ่มเติม"
              disabled={disabled}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] border border-[var(--border)] px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {!disabled && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full bal-btn py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saved ? "อัปเดตข้อมูลงาน" : "บันทึกข้อมูลงาน"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payment Section ──────────────────────────────────────────────────────────

interface PromptPayData {
  qrImage: string;
  accountName: string | null;
  amount: number;
  phase: "deposit" | "balance";
  autoVerify: boolean;
}

function PaymentSection({ token, status }: { token: string; status: Status }) {
  const router = useRouter();
  const [ppData, setPpData] = useState<PromptPayData | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [qrError, setQrError] = useState("");

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [slipError, setSlipError] = useState("");
  const [slipOk, setSlipOk] = useState(false);

  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingQr(true);
    setQrError("");
    fetch(`/api/services/order/${token}/promptpay`)
      .then((r) => r.json())
      .then((d: PromptPayData & { message?: string }) => {
        if (cancelled) return;
        if (d.qrImage) setPpData(d);
        else setQrError(d.message ?? "โหลดข้อมูลการชำระเงินไม่สำเร็จ");
      })
      .catch(() => {
        if (!cancelled) setQrError("เกิดข้อผิดพลาด กรุณารีเฟรชหน้า");
      })
      .finally(() => {
        if (!cancelled) setLoadingQr(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function onSlipChange(file: File | null) {
    setSlipError("");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    setSlipFile(file);
    const url = file ? URL.createObjectURL(file) : null;
    previewRef.current = url;
    setSlipPreview(url);
  }

  async function verifySlip() {
    if (!slipFile) { setSlipError("กรุณาแนบรูปสลิปการโอนเงิน"); return; }
    setVerifying(true);
    setSlipError("");
    try {
      const fd = new FormData();
      fd.append("file", slipFile);
      const res = await fetch(`/api/services/order/${token}/verify-slip`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSlipError((data as { message?: string }).message ?? "ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setSlipOk(true);
      setTimeout(() => router.refresh(), 800);
    } catch {
      setSlipError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setVerifying(false);
    }
  }

  const phaseLabel = ppData?.phase === "balance" ? "ส่วนที่เหลือ 60%" : "มัดจำ 40%";

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <p className="eyebrow mb-0.5">ชำระเงิน</p>
        <p className="text-sm text-[var(--text-secondary)]">
          {status === "DELIVERED"
            ? "ชำระส่วนที่เหลือ 60% เพื่อรับไฟล์ฉบับสมบูรณ์"
            : "ชำระมัดจำ 40% เพื่อเริ่มงาน"}
        </p>
      </div>

      <div className="p-5">
        {loadingQr && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        )}

        {!loadingQr && qrError && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] border border-[var(--border)] px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {qrError}
          </div>
        )}

        {!loadingQr && ppData && (
          <div className="flex flex-col items-center gap-5">
            {/* Amount */}
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{phaseLabel}</p>
              <p className="font-bebas text-5xl tracking-wider text-[var(--text-primary)] leading-none">
                {baht(ppData.amount)}
              </p>
            </div>

            {/* Step 1 */}
            <p className="text-sm text-[var(--text-secondary)] text-center">
              <span className="text-[var(--text-primary)] font-semibold">1.</span>{" "}
              สแกน QR ด้วยแอปธนาคาร แล้วโอนยอดให้ตรงตามจำนวน
            </p>

            {/* QR */}
            <div className="bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ppData.qrImage}
                alt="PromptPay QR"
                width={200}
                height={200}
                className="block"
              />
            </div>
            {ppData.accountName && (
              <p className="text-xs text-[var(--text-secondary)] -mt-3 text-center">
                {ppData.accountName}
              </p>
            )}

            {/* Step 2 */}
            <div className="w-full border-t border-[var(--border)] pt-5">
              <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
                <span className="text-[var(--text-primary)] font-semibold">2.</span>{" "}
                อัปโหลดสลิปการโอนเพื่อยืนยัน
                {!ppData.autoVerify && (
                  <span className="block text-xs text-[var(--text-muted)] mt-1">
                    ทีมงานจะตรวจสอบและยืนยันภายในไม่นาน
                  </span>
                )}
              </p>

              {slipOk ? (
                <div className="flex flex-col items-center gap-2 py-4 text-[var(--text-primary)]">
                  <CheckCircle2 className="w-10 h-10" />
                  <p className="text-sm font-semibold">ส่งสลิปสำเร็จ</p>
                  <p className="text-xs text-[var(--text-muted)]">กำลังอัปเดตสถานะ...</p>
                </div>
              ) : (
                <>
                  <label
                    className={`flex flex-col items-center justify-center gap-2 w-full border border-dashed cursor-pointer transition-colors ${
                      slipPreview
                        ? "border-[var(--text-primary)]/40 bg-[var(--bg-card)] p-3"
                        : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-primary)]/30 py-8 px-4"
                    }`}
                  >
                    {slipPreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slipPreview}
                          alt="สลิป"
                          className="max-h-44 object-contain"
                        />
                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> แนบสลิปแล้ว · แตะเพื่อเปลี่ยน
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-7 h-7 text-[var(--text-secondary)]" />
                        <span className="text-xs text-[var(--text-secondary)]">
                          แตะเพื่อเลือกรูปสลิป (สูงสุด 4MB)
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onSlipChange(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  {slipError && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-[var(--text-primary)] border border-[var(--border)] px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {slipError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={verifySlip}
                    disabled={verifying || !slipFile}
                    className="mt-4 w-full bal-btn py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {verifying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบสลิป...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> ยืนยันการชำระเงิน</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrderClient({
  order,
  token,
}: {
  order: OrderView;
  token: string;
}) {
  const [briefSaved, setBriefSaved] = useState(false);
  const status = order.status;

  const showPayment =
    status === "AWAITING_DEPOSIT" || status === "DELIVERED";
  const briefEditable =
    status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">ออเดอร์บริการตรวจงาน</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-bebas text-3xl sm:text-4xl tracking-wider text-[var(--text-primary)] leading-none">
              {order.quoteNo}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {order.customerName} · {order.contact}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Stepper */}
      <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <Stepper status={status} />
      </div>

      {/* Order summary */}
      <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <p className="eyebrow">สรุปออเดอร์</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">บริการ</span>
            <span className="text-[var(--text-primary)] text-right max-w-[60%]">{order.services}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">ปริมาณงาน</span>
            <span className="text-[var(--text-primary)]">{order.words.toLocaleString()} คำ</span>
          </div>
          <div className="border-t border-[var(--border)] pt-3 flex justify-between">
            <span className="text-sm text-[var(--text-secondary)]">รวม</span>
            <span className="font-bebas text-2xl tracking-wider text-[var(--text-primary)] leading-none">
              {baht(order.total)}
            </span>
          </div>
          <div className="border border-[var(--border)] p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">การชำระเงิน</p>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                มัดจำ 40%{" "}
                {order.depositPaidAt && (
                  <span className="text-[var(--text-muted)]">(ชำระแล้ว)</span>
                )}
              </span>
              <span className={order.depositPaidAt ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                {baht(order.deposit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                คงเหลือ 60%{" "}
                {order.balancePaidAt && (
                  <span className="text-[var(--text-muted)]">(ชำระแล้ว)</span>
                )}
              </span>
              <span className={order.balancePaidAt ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                {baht(order.balance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* State: CANCELLED */}
      {status === "CANCELLED" && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-[var(--text-muted)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ออเดอร์นี้ถูกยกเลิก</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              หากมีข้อสงสัย กรุณาติดต่อทีมงาน INKVERSE
            </p>
          </div>
        </div>
      )}

      {/* State: IN_PROGRESS */}
      {status === "IN_PROGRESS" && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-[var(--text-secondary)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ทีมงานกำลังตรวจงานของคุณ</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              ระยะเวลาขึ้นอยู่กับปริมาณงาน จะแจ้งกำหนดส่งให้ทราบ
            </p>
          </div>
        </div>
      )}

      {/* State: DELIVERED — show delivery note + prompt for balance */}
      {status === "DELIVERED" && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--text-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">งานของคุณพร้อมส่งมอบแล้ว</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                ชำระส่วนที่เหลือ 60% ({baht(order.balance)}) เพื่อรับไฟล์ฉบับสมบูรณ์
              </p>
            </div>
          </div>
          {order.deliveryNote && (
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5">หมายเหตุจากทีมงาน</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {order.deliveryNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* State: COMPLETED */}
      {status === "COMPLETED" && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--text-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">เสร็จสมบูรณ์</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                ขอบคุณที่ใช้บริการ INKVERSE ยินดีรับใช้เสมอ
              </p>
            </div>
          </div>
          {order.deliveryNote && (
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5">หมายเหตุจากทีมงาน</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {order.deliveryNote}
              </p>
            </div>
          )}
          {order.deliveryUrl && (
            <a
              href={order.deliveryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bal-btn py-3 text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> รับไฟล์ฉบับสมบูรณ์
            </a>
          )}
        </div>
      )}

      {/* Payment */}
      {showPayment && <PaymentSection token={token} status={status} />}

      {/* Creative brief */}
      {briefEditable && (
        <BriefForm
          token={token}
          order={order}
          onSaved={() => setBriefSaved(true)}
        />
      )}

      {/* Brief read-only after completed */}
      {!briefEditable && (order.genre || order.voice || order.focus) && (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-3">
          <p className="eyebrow">ข้อมูลงาน</p>
          {order.genre && (
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">แนวนิยาย</p>
              <p className="text-sm text-[var(--text-secondary)]">{order.genre}</p>
            </div>
          )}
          {order.voice && (
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">น้ำเสียง</p>
              <p className="text-sm text-[var(--text-secondary)]">{order.voice}</p>
            </div>
          )}
          {order.focus && (
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">จุดเน้น</p>
              <p className="text-sm text-[var(--text-secondary)]">{order.focus}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
        ลิงก์นี้ใช้เข้าถึงออเดอร์ของคุณ — เก็บไว้อย่างปลอดภัย ·
        หากมีข้อสงสัยติดต่อ INKVERSE ทาง {order.contact}
      </p>

      {briefSaved && <span className="sr-only">บันทึกแล้ว</span>}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    AWAITING_DEPOSIT: "รอมัดจำ",
    IN_PROGRESS: "กำลังตรวจ",
    DELIVERED: "รอรับงาน",
    COMPLETED: "เสร็จสมบูรณ์",
    CANCELLED: "ยกเลิก",
  };
  return (
    <span className="px-3 py-1 text-xs uppercase tracking-wider border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--bg-card)]">
      {map[status]}
    </span>
  );
}
