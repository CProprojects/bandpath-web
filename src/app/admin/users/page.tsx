import { Users, Crown, UserPlus, CalendarDays } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { UsersTable } from "@/components/UsersTable";
import { SignupsChart } from "@/components/SignupsChart";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/requireAdmin";

export default async function AdminUsersPage() {
  await requireAdmin();

  const admin = createAdminClient();
  const { data: allUsers } = await admin
    .from("users")
    .select("id, name, full_name, telegram_id, plan, xp_total, streak_count, created_at, last_active_at")
    .order("created_at", { ascending: false });

  const users = allUsers ?? [];
  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.plan === "pro").length;

  const now = Date.now();
  const DAY = 86_400_000;
  const newThisWeek = users.filter((u) => now - new Date(u.created_at).getTime() < 7 * DAY).length;
  const newThisMonth = users.filter((u) => now - new Date(u.created_at).getTime() < 30 * DAY).length;

  const daysBack = 14;
  const dayBuckets = new Map<string, number>();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY).toISOString().slice(0, 10);
    dayBuckets.set(d, 0);
  }
  users.forEach((u) => {
    const d = new Date(u.created_at).toISOString().slice(0, 10);
    if (dayBuckets.has(d)) dayBuckets.set(d, (dayBuckets.get(d) ?? 0) + 1);
  });
  const signupPoints = Array.from(dayBuckets.entries()).map(([date, count]) => ({ date, count }));

  return (
    <AdminShell active="/admin/users">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Users</h1>
      <p className="mt-2 text-white/50">All accounts registered on BandPath.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/15 to-bp-card/60 p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-bp-accent" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-accent">{totalUsers}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Total Users</div>
        </div>
        <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
          <Crown className="mx-auto h-5 w-5 text-bp-warning" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">{proUsers}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Pro Users</div>
        </div>
        <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
          <UserPlus className="mx-auto h-5 w-5 text-bp-success" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">{newThisWeek}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">New (7 days)</div>
        </div>
        <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
          <CalendarDays className="mx-auto h-5 w-5 text-bp-success" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">{newThisMonth}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">New (30 days)</div>
        </div>
      </div>

      <div className="mt-4">
        <SignupsChart points={signupPoints} />
      </div>

      <h2 className="mt-8 text-[11px] font-bold uppercase tracking-wider text-white/45">
        All Users ({totalUsers})
      </h2>
      <div className="mt-3">
        <UsersTable
          users={users.map((u) => ({
            id: u.id,
            name: u.name || u.full_name || null,
            telegramId: u.telegram_id,
            plan: u.plan,
            xpTotal: u.xp_total,
            streakCount: u.streak_count,
            createdAt: u.created_at,
            lastActiveAt: u.last_active_at,
          }))}
        />
      </div>
    </AdminShell>
  );
}
