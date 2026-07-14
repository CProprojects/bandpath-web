import type { WritingChartData } from "@/lib/writingTests";

const WIDTH = 560;
const HEIGHT = 260;

export function WritingChart({ data }: { data: WritingChartData }) {
  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-5">
      {data.kind === "bar" && <BarChart data={data} />}
      {data.kind === "line" && <LineChart data={data} />}
      {data.kind === "pie" && <PieChart data={data} />}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function BarChart({ data }: { data: Extract<WritingChartData, { kind: "bar" }> }) {
  const plotTop = 20;
  const plotBottom = HEIGHT - 50;
  const plotHeight = plotBottom - plotTop;
  const maxVal = Math.max(...data.series.flatMap((s) => s.values)) * 1.15;

  const groupWidth = WIDTH / data.categories.length;
  const barWidth = groupWidth / (data.series.length + 1.2);

  return (
    <>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[220px] w-full">
        <line x1="0" y1={plotBottom} x2={WIDTH} y2={plotBottom} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {data.categories.map((cat, ci) => {
          const groupX = ci * groupWidth;
          return (
            <g key={cat}>
              {data.series.map((s, si) => {
                const val = s.values[ci];
                const h = (val / maxVal) * plotHeight;
                const x = groupX + (groupWidth - data.series.length * barWidth) / 2 + si * barWidth;
                const y = plotBottom - h;
                return (
                  <g key={s.label}>
                    <rect x={x} y={y} width={barWidth - 4} height={h} rx="3" fill={s.color} opacity="0.9" />
                    <text
                      x={x + (barWidth - 4) / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(255,255,255,0.55)"
                      fontWeight="700"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={plotBottom + 18}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.55)"
                fontWeight="600"
              >
                {cat}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[10px] font-semibold text-white/35">Values in {data.unit}</p>
      <Legend items={data.series.map((s) => ({ label: s.label, color: s.color }))} />
    </>
  );
}

function LineChart({ data }: { data: Extract<WritingChartData, { kind: "line" }> }) {
  const plotTop = 20;
  const plotBottom = HEIGHT - 50;
  const plotHeight = plotBottom - plotTop;
  const maxVal = Math.max(...data.series.flatMap((s) => s.values)) * 1.1;
  const minVal = Math.min(0, ...data.series.flatMap((s) => s.values));
  const range = maxVal - minVal || 1;

  const stepX = data.xLabels.length > 1 ? WIDTH / (data.xLabels.length - 1) : WIDTH;

  return (
    <>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[220px] w-full">
        <line x1="0" y1={plotBottom} x2={WIDTH} y2={plotBottom} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {data.series.map((s) => {
          const coords = s.values.map((v, i) => ({
            x: i * stepX,
            y: plotBottom - ((v - minVal) / range) * plotHeight,
          }));
          const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
          return (
            <g key={s.label}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
        {data.xLabels.map((label, i) => (
          <text
            key={label}
            x={i * stepX}
            y={plotBottom + 18}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.55)"
            fontWeight="600"
          >
            {label}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-center text-[10px] font-semibold text-white/35">Values in {data.unit}</p>
      <Legend items={data.series.map((s) => ({ label: s.label, color: s.color }))} />
    </>
  );
}

function PieChart({ data }: { data: Extract<WritingChartData, { kind: "pie" }> }) {
  const size = 150;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`flex flex-wrap justify-center gap-8`}>
        {data.groups.map((group) => {
          const total = group.segments.reduce((sum, s) => sum + s.value, 0);
          let angle = -90;
          const arcs = group.segments.map((seg) => {
            const sweep = (seg.value / total) * 360;
            const startAngle = angle;
            angle += sweep;
            const endAngle = angle;
            const large = sweep > 180 ? 1 : 0;
            const toXY = (deg: number) => {
              const rad = (deg * Math.PI) / 180;
              return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
            };
            const [x1, y1] = toXY(startAngle);
            const [x2, y2] = toXY(endAngle);
            const path = `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
            return { path, color: seg.color, label: seg.label, pct: Math.round((seg.value / total) * 100) };
          });

          return (
            <div key={group.label} className="flex flex-col items-center gap-2">
              <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
                {arcs.map((a, i) => (
                  <path key={i} d={a.path} fill={a.color} opacity="0.9" stroke="var(--bp-card, #162d4a)" strokeWidth="1.5" />
                ))}
              </svg>
              <div className="text-xs font-bold text-white/70">{group.label}</div>
            </div>
          );
        })}
      </div>
      <Legend
        items={data.groups[0].segments.map((s) => ({
          label: s.label,
          color: s.color,
        }))}
      />
    </div>
  );
}
