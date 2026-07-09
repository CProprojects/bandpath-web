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

      <div className="mt-8 max-w-md rounded-2xl border border-bp-accent/30 bg-bp-card p-6 shadow-[0_0_24px_-8px_rgba(0,196,255,0.4)]">
        <div className="text-lg font-bold text-bp-accent">BandPath Pro</div>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-white/70">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <span className="mt-1 text-bp-success">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <UpgradeButton />
        </div>
      </div>
    </AppShell>
  );
}
