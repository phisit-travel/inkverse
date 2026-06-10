"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Loader2, Check } from "lucide-react";

interface Pkg {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus: number;
  vipDays: number;
  isPopular: boolean;
  isActive: boolean;
}

const NEW: Pkg = {
  id: "",
  name: "",
  coins: 0,
  price: 0,
  bonus: 0,
  vipDays: 0,
  isPopular: false,
  isActive: true,
};

function numField(label: string, value: number, onChange: (n: number) => void) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/60"
      />
    </label>
  );
}

function Row({ pkg }: { pkg: Pkg }) {
  const router = useRouter();
  const [p, setP] = useState(pkg);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/coin-packages/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          coins: p.coins,
          price: p.price,
          bonus: p.bonus,
          vipDays: p.vipDays,
          isPopular: p.isPopular,
          isActive: p.isActive,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 1500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">{p.id}</span>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <input type="checkbox" checked={p.isPopular} onChange={(e) => setP({ ...p, isPopular: e.target.checked })} className="accent-[var(--text-primary)]" />
            ยอดนิยม
          </label>
          <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <input type="checkbox" checked={p.isActive} onChange={(e) => setP({ ...p, isActive: e.target.checked })} className="accent-[var(--text-primary)]" />
            เปิดใช้
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">ชื่อ</span>
          <input
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/60"
          />
        </label>
        {numField("เหรียญ", p.coins, (n) => setP({ ...p, coins: n }))}
        {numField("ราคา ฿", p.price, (n) => setP({ ...p, price: n }))}
        {numField("โบนัส", p.bonus, (n) => setP({ ...p, bonus: n }))}
        {numField("VIP วัน", p.vipDays, (n) => setP({ ...p, vipDays: n }))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="bal-btn px-4 py-2 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? "บันทึกแล้ว" : "บันทึก"}
      </button>
    </div>
  );
}

export default function CoinPackagesAdmin({ initial }: { initial: Pkg[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState<Pkg>(NEW);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    setCreating(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/coin-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n),
      });
      if (res.ok) {
        setN(NEW);
        setAdding(false);
        router.refresh();
      } else {
        const d = await res.json();
        setErr(typeof d.error === "string" ? d.error : "ข้อมูลไม่ถูกต้อง");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {initial.map((pkg) => (
        <Row key={pkg.id} pkg={pkg} />
      ))}

      {adding ? (
        <div className="border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">แพ็กใหม่</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">id (a-z0-9)</span>
              <input value={n.id} onChange={(e) => setN({ ...n, id: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">ชื่อ</span>
              <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none" />
            </label>
            {numField("เหรียญ", n.coins, (v) => setN({ ...n, coins: v }))}
            {numField("ราคา ฿", n.price, (v) => setN({ ...n, price: v }))}
            {numField("โบนัส", n.bonus, (v) => setN({ ...n, bonus: v }))}
            {numField("VIP วัน", n.vipDays, (v) => setN({ ...n, vipDays: v }))}
          </div>
          {err && <p className="text-xs text-[var(--text-primary)]">{err}</p>}
          <div className="flex gap-2">
            <button onClick={create} disabled={creating} className="bal-btn px-4 py-2 text-xs font-semibold uppercase tracking-widest disabled:opacity-50">
              {creating ? "กำลังสร้าง..." : "สร้าง"}
            </button>
            <button onClick={() => { setAdding(false); setErr(""); }} className="px-4 py-2 border border-[var(--border)] text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> เพิ่มแพ็กใหม่
        </button>
      )}
    </div>
  );
}
