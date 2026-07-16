import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <main className="relative flex-1 flex flex-col items-center overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(0,196,255,.25), transparent 65%)" }}
      />

      <div className="relative">
        <Logo size={56} />
      </div>

      <h1 className="relative mt-8 max-w-2xl text-center text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
        Your smartest path to <span className="text-bp-accent">IELTS Band 7+</span>
      </h1>

      <p className="relative mt-4 max-w-xl text-center text-white/60">
        Real IELTS-format mock tests, smart vocabulary with spaced repetition,
        and band score tracking — all in one place.
      </p>

      <div className="relative mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-gradient-to-r from-bp-accent to-[#0098e0] px-6 py-3 font-bold text-[#06243c] shadow-[0_16px_36px_-12px_rgba(0,196,255,0.7)]"
        >
          Start Learning with Telegram
        </Link>
      </div>

      <section className="relative mt-20 w-full max-w-4xl">
        <h2 className="text-center text-lg font-bold text-white/80">Standard vs Pro</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-6">
            <div className="flex items-center gap-2 font-bold text-white">
              <Lock className="h-4 w-4 text-white/40" />
              Standard
            </div>
            <p className="mt-2 text-sm text-white/50">
              2 Reading tests + 1 Listening test, basic results.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-bp-accent/30 bg-gradient-to-br from-bp-accent/10 to-bp-card/70 p-6 shadow-[0_0_24px_-8px_rgba(0,196,255,0.4)]">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-60 blur-2xl"
              style={{ background: "radial-gradient(circle, rgba(0,196,255,.25), transparent 65%)" }}
            />
            <div className="relative flex items-center gap-2 font-bold text-bp-accent">
              <CheckCircle2 className="h-4 w-4" />
              Pro — $9/mo
            </div>
            <p className="relative mt-2 text-sm text-white/50">
              All tests, detailed review with hints, progress dashboard, vocabulary builder.
            </p>
          </div>
        </div>
      </section>

      <p className="relative mt-16 text-xs text-white/35">
        Join our Telegram bot for daily reminders — @BandPathBot
      </p>
    </main>
  );
}
