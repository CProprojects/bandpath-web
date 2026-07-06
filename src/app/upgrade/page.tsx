import { AppShell } from "@/components/AppShell";

export default function UpgradePage() {
  return (
    <AppShell active="/upgrade">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Upgrade to Pro</h1>
      <p className="mt-2 text-white/50">
        Placeholder — Stripe Checkout pricing page goes here (Step 6).
      </p>
    </AppShell>
  );
}
