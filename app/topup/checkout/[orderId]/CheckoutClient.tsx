"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Coins, CreditCard, Smartphone, ShieldCheck, ArrowLeft,
  CheckCircle, AlertCircle, Lock,
} from "lucide-react";
import clsx from "clsx";

interface Order {
  id: string;
  coins: number;
  bonus: number;
  price: number;
  packageName: string;
}

type Method = "CARD" | "PROMPTPAY";

function formatCard(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function CheckoutClient({
  order, userCoins, isSandbox,
}: {
  order: Order;
  userCoins: number;
  isSandbox: boolean;
}) {
  const router = useRouter();
  const total = order.coins + order.bonus;

  const [method, setMethod] = useState<Method>("CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Card fields
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");

  // PromptPay confirm state
  const [promptConfirm, setPromptConfirm] = useState(false);

  async function handlePay() {
    setError("");

    if (method === "CARD") {
      if (cardNum.replace(/\s/g, "").length < 16) return setError("กรุณากรอกหมายเลขบัตรให้ครบ 16 หลัก");
      if (expiry.length < 5) return setError("กรุณากรอกวันหมดอายุ");
      if (cvv.length < 3) return setError("กรุณากรอก CVV");
      if (!name.trim()) return setError("กรุณากรอกชื่อบนบัตร");
    }

    if (method === "PROMPTPAY" && !promptConfirm) {
      return setError("กรุณายืนยันว่าชำระผ่าน PromptPay แล้ว");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/coin/order/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      }
      router.push(`/topup/success/${order.id}`);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080a10] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        {/* Back */}
        <Link
          href="/topup"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </Link>

        {/* Sandbox banner */}
        {isSandbox && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Sandbox mode</strong> — ไม่มีการเรียกเก็บเงินจริง
              {method === "CARD" && " · ใช้ 4242 4242 4242 4242 / 12/28 / 123"}
            </span>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-[#141720] rounded-2xl border border-white/5 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">สรุปรายการ</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">{order.packageName}</span>
            <span className="text-sm text-white font-medium">{order.coins.toLocaleString()} เหรียญ</span>
          </div>
          {order.bonus > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-400">โบนัส</span>
              <span className="text-sm text-green-400">+{order.bonus.toLocaleString()} เหรียญ</span>
            </div>
          )}
          <div className="border-t border-white/5 mt-3 pt-3 flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              รวมได้รับ
            </span>
            <span className="font-bebas text-2xl text-yellow-400 tracking-wider">
              {total.toLocaleString()} เหรียญ
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-600">ยอดที่ต้องชำระ</span>
            <span className="text-xl font-bold text-white">฿{order.price.toFixed(0)}</span>
          </div>
        </div>

        {/* Payment method tabs */}
        <div className="bg-[#141720] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            {(["CARD", "PROMPTPAY"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMethod(m); setError(""); }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors",
                  method === m
                    ? "bg-white/5 text-white"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {m === "CARD" ? (
                  <><CreditCard className="w-4 h-4" /> บัตรเครดิต/เดบิต</>
                ) : (
                  <><Smartphone className="w-4 h-4" /> PromptPay</>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── CARD FORM ── */}
            {method === "CARD" && (
              <div className="space-y-3">
                {/* Card number */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">หมายเลขบัตร</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cardNum}
                      onChange={(e) => setCardNum(formatCard(e.target.value))}
                      maxLength={19}
                      className="w-full bg-[#1a1e2a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ff2d55]/50 font-mono tracking-widest"
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">วันหมดอายุ</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      className="w-full bg-[#1a1e2a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ff2d55]/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="w-full bg-[#1a1e2a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ff2d55]/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">ชื่อบนบัตร</label>
                  <input
                    type="text"
                    placeholder="FIRSTNAME LASTNAME"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full bg-[#1a1e2a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ff2d55]/50 uppercase tracking-wider"
                  />
                </div>
              </div>
            )}

            {/* ── PROMPTPAY ── */}
            {method === "PROMPTPAY" && (
              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-sm text-gray-400 text-center">
                  สแกน QR Code ด้วยแอปธนาคารของคุณ
                </p>
                {/* Mock QR */}
                <div className="relative bg-white p-4 rounded-2xl">
                  <svg
                    width="180" height="180" viewBox="0 0 180 180"
                    xmlns="http://www.w3.org/2000/svg"
                    className="block"
                  >
                    {/* Finder patterns */}
                    <rect x="10" y="10" width="50" height="50" fill="black" rx="4"/>
                    <rect x="16" y="16" width="38" height="38" fill="white" rx="2"/>
                    <rect x="22" y="22" width="26" height="26" fill="black" rx="2"/>

                    <rect x="120" y="10" width="50" height="50" fill="black" rx="4"/>
                    <rect x="126" y="16" width="38" height="38" fill="white" rx="2"/>
                    <rect x="132" y="22" width="26" height="26" fill="black" rx="2"/>

                    <rect x="10" y="120" width="50" height="50" fill="black" rx="4"/>
                    <rect x="16" y="126" width="38" height="38" fill="white" rx="2"/>
                    <rect x="22" y="132" width="26" height="26" fill="black" rx="2"/>

                    {/* Data modules (simplified pattern) */}
                    {[70,76,82,88,94,100,106,112].map((x) =>
                      [10,16,22,28,34,40,46].map((y) =>
                        (x + y) % 18 === 0 ? (
                          <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}
                    {[10,16,22,28,34,40,46,52,58,64].map((x) =>
                      [70,76,82,88,94,100,106,112,118].map((y) =>
                        (x * y) % 17 === 0 ? (
                          <rect key={`d${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}
                    {[70,76,82,88,94,100,106,112,118].map((x) =>
                      [70,76,82,88,94,100,106,112,118].map((y) =>
                        (x + y) % 13 === 0 ? (
                          <rect key={`m${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}
                    {[120,126,132,138,144,150,156,162].map((x) =>
                      [70,76,82,88,94,100,106,112,118].map((y) =>
                        (x - y) % 11 === 0 ? (
                          <rect key={`r${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}
                    {[10,16,22,28,34,40,46,52,58,64].map((x) =>
                      [120,126,132,138,144,150,156,162].map((y) =>
                        (x + y) % 14 === 0 ? (
                          <rect key={`b${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}
                    {[70,76,82,88,94,100,106,112,118].map((x) =>
                      [120,126,132,138,144,150,156,162].map((y) =>
                        (x * y) % 19 === 0 ? (
                          <rect key={`bl${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}
                    {[120,126,132,138,144,150,156,162].map((x) =>
                      [120,126,132,138,144,150,156,162].map((y) =>
                        (x + y * 2) % 15 === 0 ? (
                          <rect key={`br${x}-${y}`} x={x} y={y} width="5" height="5" fill="black"/>
                        ) : null
                      )
                    )}

                    {/* PromptPay logo area */}
                    <rect x="75" y="75" width="30" height="30" fill="white" rx="4"/>
                    <text x="90" y="95" fontSize="18" textAnchor="middle" fill="#1A56DB" fontWeight="bold">₿</text>
                  </svg>
                  {isSandbox && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                      <span className="text-xs font-bold text-gray-500 rotate-[-15deg]">SANDBOX</span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-white">฿{order.price.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">INKVERSE · ชำระผ่าน PromptPay</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => setPromptConfirm(!promptConfirm)}
                    className={clsx(
                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer",
                      promptConfirm
                        ? "bg-green-500 border-green-500"
                        : "border-white/20 group-hover:border-white/40"
                    )}
                  >
                    {promptConfirm && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-400">
                    ฉันได้ชำระเงินผ่าน PromptPay เรียบร้อยแล้ว
                  </span>
                </label>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b2b] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {loading
                ? "กำลังดำเนินการ..."
                : `ยืนยันชำระ ฿${order.price.toFixed(0)}`}
            </button>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ข้อมูลของคุณถูกเข้ารหัสด้วย SSL 256-bit</span>
        </div>
      </div>
    </div>
  );
}
