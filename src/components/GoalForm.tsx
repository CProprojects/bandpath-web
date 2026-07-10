"use client";

import { useState } from "react";
import { Target } from "lucide-react";

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export function GoalForm({
  initialExamDate,
  initialTargetBand,
}: {
  initialExamDate: string | null;
  initialTargetBand: number | null;
}) {
  const [examDate, setExamDate] = useState(initialExamDate ?? "");
  const [targetBand, setTargetBand] = useState(initialTargetBand ? String(initialTargetBand) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examDate: examDate || null,
        targetBand: targetBand ? Number(targetBand) : null,
      }),
    });
    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Couldn't save your goal.");
      return;
    }

    setSaved(true);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/10 to-bp-card/70 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <Target className="h-4 w-4 text-bp-success" />
        Your Goal
      </div>
      <p className="mt-1 text-xs text-white/45">
        Set an exam date and we&apos;ll remind you on Telegram if you haven&apos;t practiced that day.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/40">
            Exam date
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white outline-none focus:border-bp-accent"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/40">
            Target band
          </label>
          <select
            value={targetBand}
            onChange={(e) => setTargetBand(e.target.value)}
            className="w-full rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white outline-none focus:border-bp-accent"
          >
            <option value="">Not set</option>
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {b.toFixed(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-bp-success to-[#1fb85f] px-5 py-2 text-sm font-bold text-[#06243c] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-bp-danger">{error}</p>}
      {saved && <p className="mt-2 text-xs text-bp-success">Goal saved.</p>}
    </div>
  );
}
