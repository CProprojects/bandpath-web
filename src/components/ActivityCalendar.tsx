type DayActivity = { date: string; testsCompleted: number; wordsReviewed: number };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ActivityCalendar({ days }: { days: DayActivity[] }) {
  const today = todayStr();
  const byDate = new Map(days.map((d) => [d.date, d]));

  const now = new Date();
  const gridEnd = new Date(now);
  gridEnd.setDate(now.getDate() + (6 - now.getDay())); // Saturday of this week
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - 34); // 5 full weeks (35 days), starting on a Sunday

  const cells: { date: string; day: number; state: "none" | "partial" | "full" | "today" | "future" }[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const activity = byDate.get(dateStr);

    let state: "none" | "partial" | "full" | "today" | "future" = "none";
    if (dateStr > today) {
      state = "future";
    } else if (dateStr === today) {
      state = "today";
    } else if (activity && activity.testsCompleted > 0) {
      state = "full";
    } else if (activity && activity.wordsReviewed > 0) {
      state = "partial";
    }
    cells.push({ date: dateStr, day: d.getDate(), state });
  }

  const stateClass = {
    none: "bg-white/6 text-white/35",
    partial: "bg-bp-accent/35 text-white",
    full: "bg-bp-accent text-[#06243c] shadow-[0_0_8px_-2px_rgba(0,196,255,0.8)]",
    today: "bg-bp-success text-[#06243c] shadow-[0_0_8px_-2px_rgba(46,213,115,0.8)]",
    future: "text-white/12",
  };

  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-5">
      <div className="mb-4 text-sm font-bold text-white">Activity Calendar</div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[9.5px] font-bold text-white/35">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <div
            key={c.date}
            title={c.date}
            className={`flex aspect-square items-center justify-center rounded-[6px] text-[10px] font-bold ${stateClass[c.state]}`}
          >
            {c.day}
          </div>
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
