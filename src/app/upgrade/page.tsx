import { AppHeader } from "@/components/AppHeader";

export default function UpgradePage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="/upgrade" />
      <main className="flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Upgrade to Pro</h1>
        <p className="mt-2 text-white/50">
          Placeholder — Stripe Checkout pricing page goes here (Step 6).
        </p>
      </main>
    </div>
  );
}
