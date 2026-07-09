import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { HomeIcon, TestsIcon, VocabIcon, UpgradeIcon, ProfileIcon } from "@/components/NavIcons";

const NAV = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/tests", label: "Tests", Icon: TestsIcon },
  { href: "/vocabulary", label: "Vocabulary", Icon: VocabIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
  { href: "/upgrade", label: "Upgrade", Icon: UpgradeIcon },
];

export function AppShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* Desktop sidebar (768px and up) */}
      <aside className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:border-r md:border-bp-border md:px-4 md:py-6">
        <div className="px-2">
          <Logo size={34} />
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const isActive = active === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-bp-accent text-[#06243c]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-2">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar (under 768px) */}
      <header className="flex items-center justify-between border-b border-bp-border px-4 py-3 md:hidden">
        <Logo size={32} />
        <SignOutButton />
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 pb-28 md:px-10 md:py-10 md:pb-10">
        <div className="mx-auto w-full max-w-[900px]">{children}</div>
      </main>

      {/* Mobile bottom tab bar (under 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-bp-border bg-bp-bg/95 py-2 backdrop-blur md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const isActive = active === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-1 text-[10px] font-semibold ${
                isActive ? "text-bp-accent" : "text-white/40"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
