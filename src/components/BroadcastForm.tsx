"use client";

import { useState } from "react";

export function BroadcastForm() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send this message to every Telegram user? This can't be undone.`)) return;

    setSending(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();

    setSending(false);

    if (!res.ok) {
      setError(data.error || "Broadcast failed.");
      return;
    }

    setResult(data);
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        required
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your announcement…"
        className="rounded-lg border border-bp-border bg-bp-bg px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
      />

      {error && <p className="text-sm text-bp-danger">{error}</p>}
      {result && (
        <p className="text-sm text-bp-success">
          Sent to {result.sent} of {result.total} users
          {result.failed > 0 ? ` (${result.failed} failed — likely blocked the bot)` : ""}.
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="self-start rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-6 py-2.5 font-bold text-[#06243c] disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send to all Telegram users"}
      </button>
    </form>
  );
}
