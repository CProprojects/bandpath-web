type Point = { date: string; count: number };

export function SignupsChart({ points }: { points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-5">
      <div className="text-sm font-bold text-white">New Signups (last 14 days)</div>
      <div className="mt-4 flex h-[90px] items-end gap-1.5">
        {points.map((p, i) => (
          <div key={p.date} className="group relative flex-1">
            <div
              className={`w-full rounded-t-sm ${
                p.count > 0
                  ? "bg-gradient-to-t from-bp-accent to-[#5fdcff]"
                  : "bg-white/[0.06]"
              }`}
              style={{
                height: `${Math.max((p.count / max) * 90, p.count > 0 ? 6 : 2)}px`,
                boxShadow: p.count > 0 ? "0 0 8px 0 rgba(0,196,255,0.5)" : undefined,
              }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-bp-bg px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-opacity group-hover:opacity-100">
              {p.count} on {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            {i % 3 === 0 && (
              <div className="mt-1.5 text-center text-[8.5px] font-semibold text-white/35">
                {new Date(p.date).toLocaleDateString(undefined, { day: "numeric" })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
