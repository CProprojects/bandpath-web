import Link from "next/link";
import { Megaphone, Users, MessageSquare } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AdminSignOutButton } from "@/components/AdminSignOutButton";

const NAV = [
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/broadcast", label: "Broadcast", Icon: Megaphone },
  { href: "/admin/feedback", label: "Feedback", Icon: MessageSquare },
];

export function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-bp-border px-6 py-4">
        <div className="flex items-center gap-6">
          <Logo size={30} />
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, Icon }) => {
              const isActive = active === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-bp-accent to-[#0098e0] text-[#06243c]"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <AdminSignOutButton />
      </header>

      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
