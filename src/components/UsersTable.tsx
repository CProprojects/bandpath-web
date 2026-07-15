"use client";

import { useMemo, useState } from "react";
import { Search, Crown, Loader2 } from "lucide-react";

type UserRow = {
  id: string;
  name: string | null;
  telegramId: string | null;
  plan: string;
  xpTotal: number;
  streakCount: number;
  createdAt: string;
  lastActiveAt: string | null;
};

type SortKey = "createdAt" | "xpTotal" | "streakCount" | "lastActiveAt";

function formatLastOnline(iso: string | null) {
  if (!iso) return "Never active";

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "Online just now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days < 30) return `Active ${days}d ago`;
  return `Active ${new Date(iso).toLocaleDateString()}`;
}

export function UsersTable({ users: initialUsers }: { users: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? users.filter(
          (u) =>
            (u.name ?? "").toLowerCase().includes(q) ||
            (u.telegramId ?? "").toLowerCase().includes(q),
        )
      : users;

    return [...rows].sort((a, b) => {
      if (sortKey === "createdAt") return b.createdAt.localeCompare(a.createdAt);
      if (sortKey === "xpTotal") return b.xpTotal - a.xpTotal;
      if (sortKey === "lastActiveAt") return (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "");
      return b.streakCount - a.streakCount;
    });
  }, [users, query, sortKey]);

  async function togglePlan(user: UserRow) {
    const nextPlan = user.plan === "pro" ? "free" : "pro";
    setTogglingId(user.id);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: nextPlan }),
      });

      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, plan: nextPlan } : u)));
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or Telegram ID…"
            className="w-full rounded-lg border border-bp-border bg-bp-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white outline-none focus:border-bp-accent"
        >
          <option value="createdAt">Newest first</option>
          <option value="xpTotal">Most XP</option>
          <option value="streakCount">Longest streak</option>
          <option value="lastActiveAt">Most recently active</option>
        </select>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-white/40">No users match &ldquo;{query}&rdquo;.</p>
        )}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-bp-border bg-bp-card/60 p-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-white">{u.name || "Unnamed"}</span>
                {u.plan === "pro" && (
                  <span className="flex-shrink-0 rounded-full bg-bp-warning/15 px-2 py-0.5 text-[10px] font-bold text-bp-warning">
                    Pro
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-white/40">
                {u.telegramId ? `Telegram ${u.telegramId}` : "No Telegram"} · Joined{" "}
                {new Date(u.createdAt).toLocaleDateString()}
              </div>
              <div className="mt-0.5 text-xs text-white/35">{formatLastOnline(u.lastActiveAt)}</div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <div className="text-right text-xs">
                <div className="font-bold text-bp-warning">{u.xpTotal} XP</div>
                <div className="mt-0.5 text-white/40">{u.streakCount}d streak</div>
              </div>
              <button
                onClick={() => togglePlan(u)}
                disabled={togglingId === u.id}
                title={u.plan === "pro" ? "Switch to Free" : "Switch to Pro"}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  u.plan === "pro"
                    ? "border-bp-warning/30 bg-bp-warning/10 text-bp-warning hover:bg-bp-warning/20"
                    : "border-bp-border text-white/50 hover:text-white"
                }`}
              >
                {togglingId === u.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crown className="h-3.5 w-3.5" />
                )}
                {u.plan === "pro" ? "Make Free" : "Make Pro"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
