import { CheckCircle2, Crown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { UpgradeButton } from "@/components/UpgradeButton";

const PERKS = [
  "All 18 reading & listening tests, unlocked",
  "Full vocabulary practice across every test",
  "Detailed answer review with hints",
  "Progress dashboard & band-score history",
];

export default function UpgradePage() {
  return (
    <AppShell active="/upgrade">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Upgrade to Pro</h1>
      <p className="mt-2 text-white/50">
        Get the full BandPath experience — tests, vocabulary, and progress tracking.
      </p>

      <div className="relative mt-8 max-w-md overflow-hidden rounded-2xl border border-bp-accent/30 bg-gradient-to-br from-bp-accent/10 to-bp-card/80 p-6 shadow-[0_0_32px_-10px_rgba(0,196,255,0.5)]">
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(0,196,255,.25), transparent 65%)" }}
        />
        <div className="relative flex items-center gap-2">
          <Crown className="h-5 w-5 text-bp-warning" />
          <div className="text-lg font-bold text-bp-accent">BandPath Pro</div>
        </div>
        <ul className="relative mt-4 flex flex-col gap-2.5 text-sm text-white/75">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-bp-success" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="relative mt-6">
          <UpgradeButton />
        </div>
      </div>
    </AppShell>
  );
}
