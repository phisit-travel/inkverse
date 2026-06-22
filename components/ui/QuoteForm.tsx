"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, FileText, Printer, ArrowRight } from "lucide-react";
import {
  SERVICE_KEYS,
  MIN_CHARGE,
  computeQuote,
  countThaiWords,
  baht,
  type Quote,
} from "@/lib/services/pricing";

type ServerQuote = { quote: Quote; quoteNo: string; date: string };

export default function QuoteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [services, setServices] = useState<string[]>([SERVICE_KEYS[0]]);
  const [newCustomer, setNewCustomer] = useState(true);
  const [text, setText] = useState("");
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");
  const [countedWords, setCountedWords] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ServerQuote | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Debounced Thai word count — counting a 50k-word paste on every keystroke
  // would jank, so settle 250ms after typing stops.
  useEffect(() => {
    if (!text.trim()) { setCountedWords(0); return; }
    const t = setTimeout(() => setCountedWords(countThaiWords(text)), 250);
    return () => clearTimeout(t);
  }, [text]);

  const words = text.trim() ? countedWords : parseInt(manual.replace(/[^0-9]/g, ""), 10) || 0;
  const preview = useMemo(
    () => computeQuote({ words, services, newCustomer }),
    [words, services, newCustomer]
  );

  function toggle(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8_000_000) { setError("ไฟล์ใหญ่เกินไป (เกิน 8MB) — ลองวางข้อความแทน"); return; }
    setError("");
    setText(await f.text());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) { setError("กรุณากรอกชื่อและช่องทางติดต่อ"); return; }
    if (!services.length) { setError("เลือกบริการอย่างน้อย 1 อย่าง"); return; }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/services/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, contact, services, newCustomer,
          words,
          excerpt: text.trim().slice(0, 300),
          message,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setResult(d as ServerQuote); setState("done"); }
      else { setError(d.error || "ส่งไม่สำเร็จ กรุณาลองใหม่"); setState("error"); }
    } catch {
      setError("เครือข่ายขัดข้อง กรุณาลองใหม่"); setState("error");
    }
  }

  async function placeOrder() {
    setOrdering(true);
    setOrderError("");
    try {
      const res = await fetch("/api/services/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, services, newCustomer, words, message }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && (d as { token?: string }).token) {
        router.push(`/order/${(d as { token: string }).token}`);
      } else {
        setOrderError((d as { message?: string }).message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } catch {
      setOrderError("เครือข่ายขัดข้อง กรุณาลองใหม่");
    } finally {
      setOrdering(false);
    }
  }

  // ── Success: the generated quote ────────────────────────────────────────────
  if (state === "done" && result) {
    const q = result.quote;
    return (
      <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border)] p-6 flex items-start justify-between gap-4 print:border-black">
          <div>
            <p className="eyebrow mb-1">ใบเสนอราคา · INKVERSE</p>
            <p className="text-xs text-[var(--text-muted)]">เลขที่ {result.quoteNo} · {result.date}</p>
          </div>
          <Check className="w-6 h-6 shrink-0 text-[var(--text-primary)]" />
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-[var(--text-secondary)]">
            <p><span className="text-[var(--text-muted)]">ลูกค้า:</span> {name}</p>
            <p><span className="text-[var(--text-muted)]">ปริมาณงาน:</span> {q.words.toLocaleString()} คำ
              {q.freeWords > 0 && <span className="text-[var(--text-muted)]"> (ฟรีลูกค้าใหม่ {q.freeWords.toLocaleString()} คำ)</span>}</p>
          </div>

          <table className="w-full text-sm border-t border-[var(--border)]">
            <thead>
              <tr className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider">
                <th className="text-left py-2 font-normal">บริการ</th>
                <th className="text-right py-2 font-normal">คำคิดเงิน</th>
                <th className="text-right py-2 font-normal">เรต</th>
                <th className="text-right py-2 font-normal">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.service} className="border-t border-[var(--border)] text-[var(--text-secondary)]">
                  <td className="py-2.5 text-[var(--text-primary)]">{l.service}</td>
                  <td className="py-2.5 text-right">{l.words.toLocaleString()}</td>
                  <td className="py-2.5 text-right">{baht(l.rate * 1000)}/1k</td>
                  <td className="py-2.5 text-right text-[var(--text-primary)]">{baht(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--text-primary)]">
                <td colSpan={3} className="py-3 text-right text-[var(--text-secondary)] uppercase tracking-wider text-xs">รวมประเมิน</td>
                <td className="py-3 text-right font-bebas text-2xl tracking-wider text-[var(--text-primary)]">{baht(q.total)}</td>
              </tr>
            </tfoot>
          </table>

          {q.total === 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              * ยังไม่ได้ระบุปริมาณงาน — นี่คือใบรับคำขอ เราจะติดต่อกลับเพื่อประเมินราคาที่แน่นอน
            </p>
          )}
          {q.minApplied && (
            <p className="text-xs text-[var(--text-muted)]">
              * ปรับเป็นค่าบริการขั้นต่ำ {baht(MIN_CHARGE)} ต่องาน
            </p>
          )}
          {/* Payment terms — 40% deposit up front, 60% on delivery */}
          {q.total > 0 && (
            <div className="border border-[var(--border)] p-4">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-2">การชำระเงิน</p>
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>มัดจำ 40% <span className="text-[var(--text-muted)]">(ก่อนเริ่มงาน)</span></span>
                <span className="text-[var(--text-primary)]">{baht(q.deposit)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text-secondary)] mt-1">
                <span>คงเหลือ 60% <span className="text-[var(--text-muted)]">(เมื่อส่งมอบงาน)</span></span>
                <span className="text-[var(--text-primary)]">{baht(q.balance)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            ราคานี้เป็นการ<b className="text-[var(--text-secondary)]">ประเมินเบื้องต้น</b>จากปริมาณคำที่ระบุ · ราคาสุดท้ายยืนยันหลังตรวจต้นฉบับจริง ·
            ยืนราคา 14 วัน · ระยะเวลาขึ้นอยู่กับปริมาณงาน · ไม่รีไรต์/ไม่เปลี่ยนสำนวน · ต้นฉบับเป็นความลับ
          </p>

          {/* What happens next */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-2">ขั้นตอนถัดไป</p>
            <ol className="text-sm text-[var(--text-secondary)] space-y-1.5 list-decimal list-inside marker:text-[var(--text-muted)]">
              <li>ยืนยันออเดอร์ แล้วกรอกรายละเอียดงาน</li>
              <li>ชำระมัดจำ 40% ผ่าน PromptPay → เราเริ่มงานทันที</li>
              <li>แจ้งกำหนดส่งเมื่อยืนยันงาน → ชำระส่วนที่เหลือ 60% → รับไฟล์ฉบับสมบูรณ์</li>
            </ol>
          </div>

          {/* Order CTA */}
          {q.total > 0 && (
            <div className="border-t border-[var(--border)] pt-4 space-y-2">
              {orderError && (
                <p className="text-xs text-[var(--text-primary)]">{orderError}</p>
              )}
              <button
                type="button"
                onClick={placeOrder}
                disabled={ordering}
                className="w-full bal-btn py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {ordering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                ยืนยันสั่งงาน — เริ่มต้นด้วยมัดจำ 40%
              </button>
              <p className="text-[11px] text-[var(--text-muted)] text-center">
                หรือขอใบเสนอราคาเข้าอีเมลก่อนก็ได้ (ปุ่มด้านล่าง)
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1 print:hidden">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-wider text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors">
              <Printer className="w-3.5 h-3.5" /> พิมพ์ / บันทึก PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  const field =
    "w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors";
  const label = "block text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={submit} className="border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-4">
      <div>
        <label className={label}>ชื่อ *</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ / นามปากกา" />
      </div>
      <div>
        <label className={label}>ช่องทางติดต่อ *</label>
        <input className={field} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="LINE / อีเมล / เบอร์โทร" />
      </div>

      <div>
        <label className={label}>บริการที่สนใจ</label>
        <div className="flex flex-wrap gap-2">
          {SERVICE_KEYS.map((s) => (
            <button type="button" key={s} onClick={() => toggle(s)}
              className={`px-3 py-1.5 text-sm border transition-colors ${
                services.includes(s)
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/50"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Word source — paste (counted in-browser) / .txt / manual number */}
      <div>
        <label className={label}>วางข้อความนิยายเพื่อคำนวณราคาอัตโนมัติ</label>
        <textarea
          className={`${field} min-h-[110px] resize-y font-mono text-xs`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="คัดลอกข้อความจาก Google Docs / Word มาวางที่นี่ — ระบบนับคำให้ในเครื่องคุณเอง ต้นฉบับไม่ถูกส่งออก"
        />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
            <FileText className="w-3.5 h-3.5" /> แนบไฟล์ .txt
            <input type="file" accept=".txt,text/plain" onChange={onFile} className="hidden" />
          </label>
          <span className="text-[var(--text-muted)] text-xs">หรือ</span>
          <input
            className="w-40 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/50"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ระบุจำนวนคำเอง"
            disabled={!!text.trim()}
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
        <input type="checkbox" checked={newCustomer} onChange={(e) => setNewCustomer(e.target.checked)}
          className="w-4 h-4 accent-[var(--text-primary)]" />
        ฉันเป็นลูกค้าใหม่ — รับฟรี 2,500 คำแรก
      </label>

      {/* Live estimate */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">ราคาประเมิน</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {words > 0 ? `${words.toLocaleString()} คำ` : "ยังไม่มีข้อมูลคำ"}
              {preview.freeWords > 0 && ` · ฟรี ${preview.freeWords.toLocaleString()} คำ`}
            </p>
          </div>
          <p className="font-bebas text-3xl tracking-wider text-[var(--text-primary)] leading-none">{baht(preview.total)}</p>
        </div>
        {preview.lines.length > 0 && preview.total > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
            {preview.lines.map((l) => (
              <div key={l.service} className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>{l.service}</span><span>{baht(l.amount)}</span>
              </div>
            ))}
            {preview.minApplied && (
              <p className="text-[11px] text-[var(--text-muted)] pt-1">ปรับเป็นค่าขั้นต่ำ {baht(MIN_CHARGE)}/งาน</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className={label}>หมายเหตุ / ลิงก์ (ถ้ามี)</label>
        <input className={field} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="เช่น ลิงก์ Google Doc, กำหนดส่ง, รายละเอียดเพิ่มเติม" />
      </div>

      {error && <p className="text-sm text-[var(--text-primary)]">{error}</p>}
      <button type="submit" disabled={state === "sending"}
        className="w-full bal-btn py-3 text-sm font-semibold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
        {state === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        ขอใบเสนอราคา (ฟรี)
      </button>
      <p className="text-[11px] text-[var(--text-muted)] text-center">ต้นฉบับของคุณเป็นความลับ — เราไม่เผยแพร่หรือนำไปใช้</p>
    </form>
  );
}
