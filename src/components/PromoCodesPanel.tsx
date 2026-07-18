"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";

type PromoCodeItem = {
  id: string;
  code: string;
  label: string;
  discountPercent: number;
  commissionPercent: number;
  active: boolean;
  conversions: number;
  revenueStars: number;
  owedStars: number;
  pendingClicks: number;
  createdAt: string;
};

function CreateCodeForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, label, discountPercent, commissionPercent }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Couldn't create code.");
      return;
    }

    setCode("");
    setLabel("");
    setDiscountPercent("0");
    setCommissionPercent("0");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-bp-border bg-bp-card/60 p-4">
      <div className="text-sm font-bold text-white">New Promo Code</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE (e.g. ROVSHAN10)"
          className="rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Blogger / channel name"
          className="rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
        <input
          type="number"
          min="0"
          max="100"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          placeholder="Discount %"
          className="rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
        <input
          type="number"
          min="0"
          max="100"
          value={commissionPercent}
          onChange={(e) => setCommissionPercent(e.target.value)}
          placeholder="Commission %"
          className="rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
      </div>
      <button
        type="submit"
        disabled={saving || !code.trim() || !label.trim()}
        className="mt-3 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-4 py-2 text-sm font-bold text-[#06243c] disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create Code
      </button>
      {error && <p className="mt-2 text-xs text-bp-danger">{error}</p>}
    </form>
  );
}

function CodeRow({ item, onToggled }: { item: PromoCodeItem; onToggled: (id: string, active: boolean) => void }) {
  const [toggling, setToggling] = useState(false);

  async function toggleActive() {
    setToggling(true);
    const res = await fetch(`/api/admin/promo-codes/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    setToggling(false);
    if (res.ok) onToggled(item.id, !item.active);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bp-border bg-bp-card/60 p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white">{item.code}</span>
          <span className="text-xs text-white/40">{item.label}</span>
          {!item.active && (
            <span className="rounded-full bg-bp-danger/15 px-2 py-0.5 text-[10px] font-bold text-bp-danger">Inactive</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-white/40">
          <span>{item.discountPercent}% student discount</span>
          <span>{item.commissionPercent}% commission</span>
          <span>{item.pendingClicks} pending click{item.pendingClicks === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-4">
        <div className="text-right text-xs">
          <div className="font-bold text-bp-success">{item.conversions} sold</div>
          <div className="mt-0.5 text-white/40">{item.revenueStars} ⭐ revenue</div>
        </div>
        <div className="text-right text-xs">
          <div className="font-bold text-bp-warning">{item.owedStars} ⭐</div>
          <div className="mt-0.5 text-white/40">owed to blogger</div>
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
            item.active
              ? "border-bp-border text-white/50 hover:text-white"
              : "border-bp-success/30 bg-bp-success/10 text-bp-success hover:bg-bp-success/20"
          }`}
        >
          {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

export function PromoCodesPanel({ items: initialItems }: { items: PromoCodeItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.code.toLowerCase().includes(q) || i.label.toLowerCase().includes(q));
  }, [items, query]);

  function handleToggled(id: string, active: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active } : i)));
  }

  function refresh() {
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <CreateCodeForm onCreated={refresh} />

      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by code or label…"
          className="w-full rounded-lg border border-bp-border bg-bp-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-white/40">No promo codes yet.</p>}
        {filtered.map((item) => (
          <CodeRow key={item.id} item={item} onToggled={handleToggled} />
        ))}
      </div>
    </div>
  );
}
