const TYPE_LABELS: Record<string, string> = {
  tfng: "True / False",
  yesno: "Yes / No / Not Given",
  mcq: "Multiple Choice",
  multi2: "Choose Two",
  fill: "Fill in the Blank",
};

const TYPE_ORDER = ["tfng", "yesno", "mcq", "multi2", "fill"];

type QuestionResult = { type: string; correct: boolean };

export function AccuracyByType({ questionResults }: { questionResults: QuestionResult[] }) {
  const totals = new Map<string, { correct: number; total: number }>();
  for (const q of questionResults) {
    const entry = totals.get(q.type) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (q.correct) entry.correct += 1;
    totals.set(q.type, entry);
  }

  const rows = TYPE_ORDER.filter((t) => totals.has(t)).map((t) => {
    const { correct, total } = totals.get(t)!;
    return { type: t, label: TYPE_LABELS[t] ?? t, pct: Math.round((correct / total) * 100) };
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-bp-border bg-bp-card/40 p-5">
        <div className="text-sm font-bold text-white">Accuracy by Type</div>
        <p className="mt-6 mb-4 text-center text-xs text-white/35">
          Take a test to see your accuracy broken down by question type.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-5">
      <div className="mb-4 text-sm font-bold text-white">Accuracy by Type</div>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => {
          const barColor =
            r.pct >= 70 ? "bg-bp-success" : r.pct >= 45 ? "bg-bp-accent" : "bg-bp-danger";
          const textColor =
            r.pct >= 70 ? "text-bp-success" : r.pct >= 45 ? "text-bp-accent" : "text-bp-danger";
          return (
            <div key={r.type}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-white/70">{r.label}</span>
                <span className={`font-bold ${textColor}`}>{r.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
