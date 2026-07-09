"use client";

import { Logo } from "@/components/Logo";
import { TelegramLoginBox } from "@/components/TelegramLoginBox";

export function LoginForm() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-bp-border bg-bp-card p-8">
      <div className="flex justify-center">
        <Logo />
      </div>
      <h1 className="mt-6 text-center text-xl font-bold text-white">Log in with Telegram</h1>
      <p className="mt-2 text-center text-sm text-white/40">
        New here? The same button creates your account automatically.
      </p>

      <div className="mt-6">
        <TelegramLoginBox />
      </div>
    </div>
  );
}
