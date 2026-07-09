type DayActivity = { date: string; testsCompleted: number; wordsReviewed: number };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ActivityCalendar({ days }: { days: DayActivity[] }) {
  const today = todayStr();
  const byDate = new Map(days.map((d) => [d.date, d]));

  const cells: { date: string; state: "none" | "partial" | "full" | "today" }[] = [];
  const DAYS_BACK = 34; // 5 full weeks including today
  for (let i = DAYS_BACK; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const activity = byDate.get(dateStr);
    let state: "none" | "partial" | "full" | "today" = "none";
    if (dateStr === today) {
      state = "today";
    } else if (activity && activity.testsCompleted > 0) {
      state = "full";
    } else if (activity && activity.wordsReviewed > 0) {
      state = "partial";
    }
    cells.push({ date: dateStr, state });
  }

  const stateClass = {
    none: "bg-white/6",
    partial: "bg-bp-accent/35",
    full: "bg-bp-accent shadow-[0_0_8px_-2px_rgba(0,196,255,0.8)]",
    today: "bg-bp-success shadow-[0_0_8px_-2px_rgba(46,213,115,0.8)]",
  };

  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-5">
      <div className="mb-4 text-sm font-bold text-white">Activity Calendar</div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <div key={c.date} title={c.date} className={`aspect-square rounded-[5px] ${stateClass[c.state]}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-semibold text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-bp-accent" />
          Full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-bp-accent/35" />
          Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-bp-success" />
          Today
        </span>
      </div>
    </div>
  );
}
