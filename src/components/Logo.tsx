export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center rounded-xl border border-bp-accent/30 shadow-[0_0_20px_-6px_rgba(0,196,255,0.5)]"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(150deg,#0e2c49,#0a2036)",
        }}
      >
        <svg viewBox="0 0 40 40" width={size * 0.6} height={size * 0.6}>
          <path
            d="M6 32 C 14 30, 18 16, 26 13"
            fill="none"
            stroke="#00C4FF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="29" cy="11" r="6" fill="none" stroke="#00C4FF" strokeWidth="2.5" />
          <circle cx="29" cy="11" r="2" fill="#00C4FF" />
        </svg>
      </div>
      <span className="text-xl font-extrabold tracking-tight text-white">
        Band<span className="text-bp-accent">Path</span>
      </span>
    </div>
  );
}
