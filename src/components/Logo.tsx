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
          <circle cx="7" cy="32.5" r="2.3" fill="#00C4FF" />
          <circle cx="10.3" cy="29.2" r="1.3" fill="#00C4FF" />
          <circle cx="14.4" cy="25.9" r="2.7" fill="#5fdcff" />
          <circle cx="17.3" cy="23.4" r="1.2" fill="#00C4FF" />
          <circle cx="20" cy="21.1" r="1.1" fill="#00C4FF" />
          <circle cx="22.7" cy="18.8" r="1.05" fill="#00C4FF" />
          <circle cx="27" cy="15" r="6.8" fill="none" stroke="#00C4FF" strokeWidth="2.8" />
          <circle cx="26" cy="13.3" r="2.6" fill="#00C4FF" />
        </svg>
      </div>
      <span className="text-xl font-extrabold tracking-tight text-white">
        Band<span className="text-bp-accent">Path</span>
      </span>
    </div>
  );
}
