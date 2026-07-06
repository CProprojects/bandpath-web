"use client";

import Link from "next/link";
import { useState } from "react";
import { ReadingIcon, ListeningIcon, LockIcon } from "@/components/TestIcons";

export type TestCardData = {
  id: string;
  title: string;
  type: "reading" | "listening";
  questionCount: number;
  durationMinutes: number;
  difficulty: string;
  locked: boolean;
  bestBand: number | undefined;
};

type Filter = "all" | "reading" | "listening";

export function TestsGrid({ tests }: { tests: TestCardData[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = tests.filter((t) => filter === "all" || t.type === filter);

  return (
    <div>
      <div className="mt-6 flex gap-2">
        {(["reading", "listening", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              filter === f
                ? "bg-bp-accent text-[#06243c]"
                : "border border-bp-border text-white/60 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((test) => {
          const Icon = test.type === "reading" ? ReadingIcon : ListeningIcon;

          const card = (
            <div
              className={`flex items-center gap-4 rounded-2xl border border-bp-border p-4 transition-colors ${
                test.locked ? "bg-bp-card/50 opacity-60" : "bg-bp-card hover:border-bp-accent/40"
              }`}
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                  test.type === "reading"
                    ? "bg-bp-accent/15 text-bp-accent"
                    : "bg-bp-warning/15 text-bp-warning"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{test.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                  <span>
                    {test.questionCount} questions · {test.durationMinutes} min
                  </span>
                  <span className="rounded-full bg-bp-success/15 px-2 py-0.5 font-semibold text-bp-success">
                    {test.difficulty}
                  </span>
                </div>
              </div>
              {test.locked ? (
                <LockIcon className="h-5 w-5 flex-shrink-0 text-white/40" />
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
