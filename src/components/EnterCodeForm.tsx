"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function EnterCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get("token");

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/telegram/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setVerifying(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setVerifying(false);
    }
  }

  if (!sessionToken) {
    return (
      <p className="text-center text-sm text-white/50">
        This link is missing or invalid. Please open BandPath again from the Telegram bot&apos;s{" "}
        <strong>Go to Platform</strong> button.
      </p>
    );
  }

  return (
    <form onSubmit={verifyCode} className="flex flex-col gap-3">
      <p className="text-center text-sm text-white/50">
        Enter the code Telegram just sent you to finish logging in.
      </p>
      <input
        required
        autoFocus
        inputMode="numeric"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        className="rounded-lg border border-bp-border bg-bp-bg px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
      />
      {error && <p className="text-sm text-bp-danger">{error}</p>}
      <button
        type="submit"
        disabled={verifying || !code}
        className="rounded-xl bg-gradient-to-r from-bp-accent to-[#0098e0] py-3 text-sm font-bold text-[#06243c] disabled:opacity-50"
      >
        {verifying ? "Verifying…" : "Enter"}
      </button>
    </form>
  );
}
