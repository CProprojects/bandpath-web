const WIDTH = 280;
const HEIGHT = 110;

type Point = { date: string; band: number };

export function BandTrendChart({
  title,
  points,
  color = "accent",
  gradientId,
}: {
  title: string;
  points: Point[];
  color?: "accent" | "success" | "warning";
  gradientId: string;
}) {
  const stroke = { accent: "#00C4FF", success: "#2ed573", warning: "#ffa502" }[color];
  const glow = { accent: "rgba(0,196,255,.7)", success: "rgba(46,213,115,.7)", warning: "rgba(255,165,2,.7)" }[
    color
  ];

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-bp-border bg-bp-card/40 p-5">
        <div className="text-sm font-bold text-white">{title}</div>
        <p className="mt-6 mb-4 text-center text-xs text-white/35">
          Complete a test to start your trend.
        </p>
      </div>
    );
  }

  const bands = points.map((p) => p.band);
  const min = Math.min(...bands) - 0.5;
  const max = Math.max(...bands) + 0.5;
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? WIDTH : (i / (points.length - 1)) * WIDTH;
    const y = HEIGHT - ((p.band - min) / range) * HEIGHT;
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
  const last = coords[coords.length - 1];

  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-5">
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="relative mt-4 h-[110px]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity="0.4" />
              <stop offset="1" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 5px ${glow})` }}
          />
          <circle cx={last.x} cy={last.y} r="4.5" fill="#fff" stroke={stroke} strokeWidth="2.5" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[9.5px] font-semibold text-white/40">
        {points.map((p, i) => (
          <span key={i} className={i === points.length - 1 ? "text-white/70" : undefined}>
            {p.date}
          </span>
        ))}
      </div>
    </div>
  );
}
