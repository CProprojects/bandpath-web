"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Stage = "idle" | "waiting" | "verifying";

export function TelegramLoginBox() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function startTelegramLogin() {
    setError(null);

    // Safari only trusts window.open()/navigation as user-initiated when it
    // happens synchronously inside the click handler — the `await fetch`
    // below breaks that on desktop Safari and the popup gets silently
    // blocked. Opening a blank tab now (still inside the click) and pointing
    // it at the real link once we have it keeps it tied to the gesture.
    // Same-tab mobile navigation isn't subject to the popup blocker.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const pending = isMobile ? null : window.open("", "_blank");

    const res = await fetch("/api/auth/telegram/start", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      pending?.close();
      setError(data.error || "Could not start Telegram login.");
      return;
    }

    setSessionToken(data.sessionToken);
    setDeepLink(data.deepLink);
    setStage("waiting");

    if (isMobile) {
      window.location.href = data.deepLink;
    } else if (pending) {
      pending.location.href = data.deepLink;
    } else {
      // Safari blocked even the blank-tab open — fall back to same-tab.
      window.open(data.deepLink, "_blank");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;

    setStage("verifying");
    setError(null);

    const res = await fetch("/api/auth/telegram/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, code }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Verification failed.");
      setStage("waiting");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {stage === "idle" && (
        <button
          type="button"
          onClick={startTelegramLogin}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 px-4 py-2.5 text-sm font-bold text-[#5fc4ef]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
          </svg>
          Continue with Telegram
        </button>
      )}

      {stage !== "idle" && (
        <form
          onSubmit={verifyCode}
          className="flex flex-col gap-2 rounded-lg border border-bp-border bg-bp-bg p-3"
        >
          <p className="text-xs text-white/50">
            Telegram should have opened to our bot — press <strong>Start</strong> there,
            then come back here and type the code it sends you.
          </p>
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-bp-accent underline underline-offset-2"
            >
              Didn&apos;t open automatically? Tap here to open Telegram
            </a>
          )}
          <input
            required
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="rounded-lg border border-bp-border bg-bp-card px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
          />
          <button
            type="submit"
            disabled={stage === "verifying"}
            className="rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-4 py-2 text-sm font-bold text-[#06243c] disabled:opacity-50"
          >
            {stage === "verifying" ? "Verifying…" : "Verify code"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-bp-danger">{error}</p>}
    </div>
  );
}
