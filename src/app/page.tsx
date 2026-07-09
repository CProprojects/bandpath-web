import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16">
      <Logo size={56} />

      <h1 className="mt-8 max-w-2xl text-center text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
        Your smartest path to <span className="text-bp-accent">IELTS Band 7+</span>
      </h1>

      <p className="mt-4 max-w-xl text-center text-white/60">
        Real IELTS-format mock tests, smart vocabulary with spaced repetition,
        and band score tracking — all in one place.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-gradient-to-r from-bp-accent to-[#0098e0] px-6 py-3 font-bold text-[#06243c] shadow-[0_16px_36px_-12px_rgba(0,196,255,0.7)]"
        >
          Start Learning with Telegram
        </Link>
      </div>

      <section className="mt-20 w-full max-w-4xl">
        <h2 className="text-center text-lg font-bold text-white/80">
          Free vs Pro
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-bp-border bg-bp-card p-6">
            <div className="font-bold text-white">Free</div>
            <p className="mt-2 text-sm text-white/50">
              2 Reading tests + 1 Listening test, basic results.
            </p>
          </div>
          <div className="rounded-2xl border border-bp-accent/30 bg-bp-card p-6 shadow-[0_0_24px_-8px_rgba(0,196,255,0.4)]">
            <div className="font-bold text-bp-accent">Pro — $9/mo</div>
            <p className="mt-2 text-sm text-white/50">
              All tests, detailed review with hints, progress dashboard, vocabulary builder.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-16 text-xs text-white/35">
        Join our Telegram bot for daily reminders — @BandPathBot
      </p>
    </main>
  );
}
