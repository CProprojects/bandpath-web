"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect code.");
        return;
      }

      router.push(searchParams.get("next") || "/admin/users");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="password"
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Admin access code"
          className="w-full rounded-lg border border-bp-border bg-bp-bg py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
      </div>

      {error && <p className="text-sm text-bp-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !code}
        className="rounded-xl bg-gradient-to-r from-bp-accent to-[#0098e0] py-3 text-sm font-bold text-[#06243c] disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
