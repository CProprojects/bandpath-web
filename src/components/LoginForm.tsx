"use client";

import { Logo } from "@/components/Logo";
import { TelegramLoginBox } from "@/components/TelegramLoginBox";

export function LoginForm() {
  return (
    <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/10 to-bp-card/80 p-8 shadow-[0_0_32px_-10px_rgba(0,196,255,0.4)]">
      <div
        className="pointer-events-none absolute -left-12 -top-16 h-52 w-52 rounded-full opacity-60 blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(0,196,255,.22), transparent 65%)" }}
      />
      <div className="relative flex justify-center">
        <Logo />
      </div>
      <h1 className="relative mt-6 text-center text-xl font-bold text-white">Log in with Telegram</h1>
      <p className="relative mt-2 text-center text-sm text-white/40">
        New here? The same button creates your account automatically.
      </p>

      <div className="relative mt-6">
        <TelegramLoginBox />
      </div>
    </div>
  );
}
