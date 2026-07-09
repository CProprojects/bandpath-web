import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BandTrendChart } from "@/components/BandTrendChart";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: results } = await supabase
    .from("test_results")
    .select("test_type, score_band, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: true });

  const toPoints = (type: "reading" | "listening") =>
    (results ?? [])
      .filter((r): r is typeof r & { score_band: number } => r.test_type === type && r.score_band != null)
      .slice(-8)
      .map((r) => ({
        date: new Date(r.completed_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
        band: r.score_band,
      }));

  const readingPoints = toPoints("reading");
  const listeningPoints = toPoints("listening");

  return (
    <AppShell active="/progress">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Progress</h1>
      <p className="mt-2 text-white/50">Track your band score trend for each test type.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <BandTrendChart title="Reading Band Trend" points={readingPoints} color="accent" gradientId="bp-progress-reading" />
        <BandTrendChart title="Listening Band Trend" points={listeningPoints} color="success" gradientId="bp-progress-listening" />
      </div>
    </AppShell>
  );
}
