"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleConfirm() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-bp-border px-4 py-2 text-sm font-semibold text-white/70 hover:text-white"
      >
        Sign out
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !signingOut && setConfirming(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-bp-border bg-bp-card p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-50 blur-2xl"
              style={{ background: "radial-gradient(circle, rgba(255,107,107,.25), transparent 65%)" }}
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-bp-danger/15 text-bp-danger">
              <LogOut className="h-6 w-6" />
            </div>
            <h2 className="relative mt-4 text-lg font-bold text-white">Sign out?</h2>
            <p className="relative mt-1.5 text-sm text-white/50">
              You&apos;ll need to log in again with Telegram to get back in.
            </p>
            <div className="relative mt-6 flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={signingOut}
                className="flex-1 rounded-xl border border-bp-border py-2.5 text-sm font-bold text-white/70 transition-colors hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={signingOut}
                className="flex-1 rounded-xl bg-bp-danger py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
