import Link from "next/link";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/tests", label: "Tests" },
  { href: "/upgrade", label: "Upgrade" },
];

export function AppHeader({ active }: { active?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-bp-border px-6 py-4">
      <Logo size={36} />
      <nav className="flex gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              active === item.href
                ? "bg-bp-accent text-[#06243c]"
                : "text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
