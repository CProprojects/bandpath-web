"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(searchParams.get("redirectTo") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-bp-border bg-bp-card p-8">
      <div className="flex justify-center">
        <Logo />
      </div>
      <h1 className="mt-6 text-center text-xl font-bold text-white">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-bp-border bg-bp-bg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-bp-border bg-bp-bg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
        />

        {error && <p className="text-sm text-bp-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-4 py-2.5 font-bold text-[#06243c] disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        No account?{" "}
        <Link href="/register" className="text-bp-accent">
          Register
        </Link>
      </p>
    </div>
  );
}
