import { Suspense } from "react";
import { KeyRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { EnterCodeForm } from "@/components/EnterCodeForm";

export default function EnterCodePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/10 to-bp-card/80 p-8 shadow-[0_0_32px_-10px_rgba(0,196,255,0.4)]">
        <div
          className="pointer-events-none absolute -left-12 -top-16 h-52 w-52 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(0,196,255,.22), transparent 65%)" }}
        />
        <div className="relative flex justify-center">
          <Logo />
        </div>
        <div className="relative mt-6 flex items-center justify-center gap-2">
          <KeyRound className="h-5 w-5 text-bp-accent" />
          <h1 className="text-xl font-bold text-white">Enter Your Code</h1>
        </div>

        <div className="relative mt-6">
          <Suspense>
            <EnterCodeForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
