"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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

type SortKey = "createdAt" | "xpTotal" | "streakCount";

export function UsersTable({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");

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
      return b.streakCount - a.streakCount;
    });
  }, [users, query, sortKey]);

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
            </div>
            <div className="flex-shrink-0 text-right text-xs">
              <div className="font-bold text-bp-warning">{u.xpTotal} XP</div>
              <div className="mt-0.5 text-white/40">{u.streakCount}d streak</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
