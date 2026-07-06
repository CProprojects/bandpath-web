import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function RegisterPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-bp-border bg-bp-card p-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-center text-sm text-white/50">
          Placeholder — real registration wired up in Step 3.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            disabled
            placeholder="Name"
            className="rounded-lg border border-bp-border bg-bp-bg px-4 py-2.5 text-sm text-white placeholder:text-white/30"
          />
          <input
            disabled
            placeholder="Email"
            className="rounded-lg border border-bp-border bg-bp-bg px-4 py-2.5 text-sm text-white placeholder:text-white/30"
          />
          <input
            disabled
            placeholder="Password"
            type="password"
            className="rounded-lg border border-bp-border bg-bp-bg px-4 py-2.5 text-sm text-white placeholder:text-white/30"
          />
          <button
            disabled
            className="rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-4 py-2.5 font-bold text-[#06243c] opacity-50"
          >
            Start Learning
          </button>
        </div>

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
