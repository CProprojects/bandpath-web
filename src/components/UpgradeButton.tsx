"use client";

import { openTelegramDeepLink } from "@/lib/telegramDeepLink";

export function UpgradeButton() {
  function handleClick() {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    openTelegramDeepLink(`https://t.me/${botUsername}?start=upgrade`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-bp-accent to-[#0098e0] px-4 py-3 text-sm font-bold text-[#06243c]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
      </svg>
      Upgrade via Telegram
    </button>
  );
}
