"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, AlertCircle, Loader2, Zap, Clock, Info, CreditCard } from "lucide-react";
import clsx from "clsx";
import { BANK_OPTIONS } from "@/lib/omise-payout";

// Earnings are already net of the 20% platform fee (taken at unlock). Withdrawals
// pay out the full balance — the translator receives exactly the amount requested.
const MIN_WITHDRAW = 100;

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "รอดำเนินการ",  cls: "bg-[var(--bg-card)] text-[var(--text-primary)]" },
  PROCESSING: { label: "กำลังโอน",     cls: "bg-[var(--bg-card)] text-[var(--text-secondary)]" },
  PAID:       { label: "โอนแล้ว",      cls: "bg-[var(--bg-card)] text-[var(--text-primary)]" },
  FAILED:     { label: "ไม่สำเร็จ",    cls: "bg-[var(--bg-card)] text-[var(--text-primary)]" },
  REJECTED:   { label: "ถูกปฏิเสธ",    cls: "bg-[var(--bg-card)] text-[var(--text-primary)]" },
};

interface WithdrawClientProps {
  availableBalance: number;
  history: {
    id: string; amount: number; status: string;
    paymentMethod: string; accountNumber: string; bankName: string | null;
    bankCode: string | null; requestedAt: string; processedAt: string | null;
    adminNote: string | null;
  }[];
}

export default function WithdrawClient({ availableBalance, history }: WithdrawClientProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState<string>(BANK_OPTIONS[0].code);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ auto: boolean; amount: number } | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const canSubmit =
    amountNum >= MIN_WITHDRAW &&
    amountNum <= availableBalance + 0.001 &&
    accountName.trim().length > 0 &&
    /^\d{5,20}$/.test(accountNumber.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;
    setLoading(true);
    try {
      const bank = BANK_OPTIONS.find((b) => b.code === bankCode);
      const res = await fetch("/api/translator/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          bankCode,
          bankName: bank?.name,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; auto?: boolean; amount?: number };
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }
      setSubmitted({ auto: data.auto ?? false, amount: data.amount ?? amountNum });
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Balance */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-5">
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-1">ยอดที่ถอนได้</p>
        <p className="font-bebas text-5xl text-[var(--text-primary)] tracking-wider">฿{availableBalance.toFixed(2)}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">ถอนขั้นต่ำ ฿{MIN_WITHDRAW} · โอนเข้าบัญชีธนาคารอัตโนมัติ</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-white/3 border border-[var(--border)] text-xs text-[var(--text-secondary)]">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          ยอดสะสมของคุณหักค่าแพลตฟอร์มแล้วตั้งแต่ตอนปลดล็อก — <span className="text-[var(--text-primary)] font-medium">ถอนได้เต็มจำนวน ไม่หักเพิ่ม</span>
        </span>
      </div>

      {submitted ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 text-center space-y-4">
          {submitted.auto ? (
            <Zap className="w-10 h-10 text-[var(--text-primary)] mx-auto" />
          ) : (
            <Clock className="w-10 h-10 text-[var(--text-primary)] mx-auto" />
          )}
          <div>
            <p className="text-[var(--text-primary)] font-semibold uppercase tracking-wide">
              {submitted.auto ? "ส่งคำสั่งโอนสำเร็จ" : "รับคำขอถอนเงินแล้ว"}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {submitted.auto
                ? "ระบบส่งคำสั่งโอนผ่าน Omise แล้ว เงินจะเข้าภายใน 1–3 วันทำการ"
                : "ทีมงานจะดำเนินการโอนภายใน 1–2 วันทำการ"}
            </p>
          </div>
          <p className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider">฿{submitted.amount.toFixed(2)}</p>
          <button onClick={() => { setSubmitted(null); setAmount(""); }} className="text-xs text-[var(--text-primary)] hover:underline uppercase tracking-widest">
            ส่งคำขออีกครั้ง
          </button>
        </div>
      ) : availableBalance < MIN_WITHDRAW ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 text-center space-y-2">
          <Wallet className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">ยอดเงินต่ำกว่าขั้นต่ำ (฿{MIN_WITHDRAW}) ยังถอนไม่ได้</p>
          <p className="text-xs text-[var(--text-muted)]">ยอดปัจจุบัน: ฿{availableBalance.toFixed(2)}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">ขอถอนเงิน</h2>

          {/* Amount */}
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block uppercase tracking-widest">จำนวนเงิน (บาท)</label>
            <div className="flex gap-2">
              <input
                type="number" min={MIN_WITHDRAW} max={availableBalance} step={1}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={`ขั้นต่ำ ฿${MIN_WITHDRAW}`}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/50"
              />
              <button type="button" onClick={() => setAmount(String(Math.floor(availableBalance)))}
                className="px-3 py-2.5 text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--text-primary)]/40 transition-colors uppercase tracking-widest">
                ทั้งหมด
              </button>
            </div>
            {amountNum > 0 && amountNum < MIN_WITHDRAW && (
              <p className="text-xs text-[var(--text-primary)] mt-1.5">ต้องถอนอย่างน้อย ฿{MIN_WITHDRAW}</p>
            )}
          </div>

          {/* Bank */}
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block uppercase tracking-widest">ธนาคาร</label>
            <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/50">
              {BANK_OPTIONS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>

          {/* Account number */}
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block uppercase tracking-widest">เลขบัญชี</label>
            <input
              type="text" inputMode="numeric" value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="เลขบัญชี (ตัวเลขเท่านั้น)"
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/50 font-mono"
            />
          </div>

          {/* Account name */}
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block uppercase tracking-widest">ชื่อเจ้าของบัญชี</label>
            <input
              type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
              placeholder="ชื่อ-นามสกุล ตรงกับบัญชีธนาคาร"
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/50"
            />
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-primary)]">
            <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            ระบบโอนอัตโนมัติผ่าน Omise ภายใน 1–3 วันทำการ ไม่ต้องรอแอดมินอนุมัติ
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading || !canSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 bal-btn font-semibold text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-40">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {loading ? "กำลังดำเนินการ..." : `ถอน ฿${amountNum >= MIN_WITHDRAW ? amountNum.toFixed(0) : ""}`}
          </button>
        </form>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">ประวัติคำขอถอนเงิน</h2>
          <div className="divide-y divide-white/5">
            {history.map((w) => {
              const s = STATUS_STYLE[w.status] ?? STATUS_STYLE.PENDING;
              return (
                <div key={w.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-primary)]">฿{w.amount.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 ${s.cls}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{w.bankName ?? "ธนาคาร"} · {w.accountNumber}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(w.requestedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    {w.processedAt && ` · โอนแล้ว ${new Date(w.processedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
                  </p>
                  {w.adminNote && (
                    <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-card)] px-2 py-1">{w.adminNote}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
