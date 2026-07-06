"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-bp-border bg-bp-card p-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-bold text-white">Create your account</h1>

        {checkEmail ? (
          <p className="mt-6 text-center text-sm text-bp-success">
            Almost done — check your email for a confirmation link to activate your account.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-bp-border bg-bp-bg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
            />
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
              minLength={6}
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
              {loading ? "Creating account…" : "Start Learning"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/login" className="text-bp-accent">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
