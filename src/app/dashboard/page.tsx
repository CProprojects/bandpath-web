import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, plan, streak_count, trial_ends_at")
    .eq("id", user.id)
    .single();

  return (
    <AppShell active="/dashboard">
      <h1 className="text-2xl font-bold text-white md:text-3xl">
        Welcome back, {profile?.name || user.email}!
      </h1>
      <p className="mt-2 text-white/50">
        Logged in as {user.email} · Plan:{" "}
        <span className="text-bp-accent">{profile?.plan ?? "free"}</span> · Streak:{" "}
        {profile?.streak_count ?? 0} days
      </p>
      <p className="mt-6 text-sm text-white/40">
        This confirms Supabase auth + your profile row (auto-created by the signup
        trigger) are working end to end. Real dashboard widgets (band estimate,
        today&apos;s tasks, recent results) come in a later step.
      </p>
    </AppShell>
  );
}
