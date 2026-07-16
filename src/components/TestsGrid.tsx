"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Headphones, PenLine, Lock, Crown } from "lucide-react";

export type TestCardData = {
  id: string;
  title: string;
  type: "reading" | "listening" | "writing";
  questionCount: number;
  durationMinutes: number;
  difficulty: string;
  requiresPro: boolean;
  locked: boolean;
  bestBand: number | undefined;
};

type Filter = "all" | "reading" | "listening" | "writing" | "pro";

const FILTERS: { key: Filter; label: string; Icon?: typeof Crown }[] = [
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "writing", label: "Writing" },
  { key: "pro", label: "Pro", Icon: Crown },
  { key: "all", label: "All" },
];

const TYPE_STYLES = {
  reading: {
    Icon: BookOpen,
    border: "border-bp-accent/15 hover:border-bp-accent/40",
    iconBg: "bg-gradient-to-br from-bp-accent/20 to-bp-accent/5 text-bp-accent",
  },
  listening: {
    Icon: Headphones,
    border: "border-bp-warning/15 hover:border-bp-warning/40",
    iconBg: "bg-gradient-to-br from-bp-warning/20 to-bp-warning/5 text-bp-warning",
  },
  writing: {
    Icon: PenLine,
    border: "border-bp-success/15 hover:border-bp-success/40",
    iconBg: "bg-gradient-to-br from-bp-success/20 to-bp-success/5 text-bp-success",
  },
} as const;

export function TestsGrid({ tests }: { tests: TestCardData[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = tests.filter((t) => {
    if (filter === "all") return true;
    if (filter === "pro") return t.requiresPro;
    return t.type === filter;
  });

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === key
                ? key === "pro"
                  ? "bg-gradient-to-r from-amber-400 to-amber-300 text-[#3a2600] shadow-[0_8px_20px_-8px_rgba(251,191,36,0.7)]"
                  : "bg-gradient-to-r from-bp-accent to-[#0098e0] text-[#06243c] shadow-[0_8px_20px_-8px_rgba(0,196,255,0.6)]"
                : key === "pro"
                  ? "border border-amber-400/40 text-amber-300 hover:border-amber-300/70"
                  : "border border-bp-border text-white/60 hover:text-white"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((test) => {
          const { Icon, border, iconBg } = TYPE_STYLES[test.type];

          const card = (
            <div
              className={`relative flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                test.requiresPro
                  ? `border-amber-400/60 bg-gradient-to-br from-amber-400/10 to-bp-card/60 shadow-[0_0_22px_-6px_rgba(251,191,36,0.55)] hover:border-amber-300/80 ${
                      test.locked ? "opacity-75" : ""
                    }`
                  : test.locked
                    ? "border-bp-border bg-bp-card/50 opacity-60"
                    : `${border} bg-bp-card/60`
              }`}
            >
              {test.requiresPro && (
                <Crown className="absolute right-3 top-3 h-4 w-4 text-amber-400" />
              )}
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{test.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                  <span>
                    {test.questionCount} {test.type === "writing" ? "tasks" : "questions"} ·{" "}
                    {test.durationMinutes} min
                  </span>
                  <span className="rounded-full bg-bp-success/15 px-2 py-0.5 font-semibold text-bp-success">
                    {test.difficulty}
                  </span>
                </div>
              </div>
              {test.locked ? (
                <Lock className="h-5 w-5 flex-shrink-0 text-white/40" />
              ) : test.bestBand !== undefined ? (
                <div className="flex-shrink-0 font-bold text-bp-success">
                  {test.bestBand.toFixed(1)}
                </div>
              ) : (
                <div className="flex-shrink-0 text-white/30">—</div>
              )}
            </div>
          );

          return (
            <Link key={test.id} href={test.locked ? "/upgrade" : `/tests/${test.id}`}>
              {card}
            </Link>
          );
        })}

        {visible.length === 0 && (
          <p className="text-sm text-white/40">No {filter} tests yet.</p>
        )}
      </div>
    </div>
  );
}
