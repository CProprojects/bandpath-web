import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BandTrendChart } from "@/components/BandTrendChart";
import { AccuracyByType } from "@/components/AccuracyByType";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { createClient } from "@/lib/supabase/server";

type QuestionResult = { id: number; type: string; correct: boolean; answered: boolean };

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 34);

  const [{ data: results }, { data: activity }, { data: writingResults }] = await Promise.all([
    supabase
      .from("test_results")
      .select("test_type, score_band, completed_at, question_results_json")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: true }),
    supabase
      .from("daily_activity")
      .select("date, tests_completed, words_reviewed")
      .eq("user_id", user.id)
      .gte("date", thirtyFiveDaysAgo.toISOString().slice(0, 10)),
    supabase
      .from("writing_submissions")
      .select("overall_band, completed_at")
      .eq("user_id", user.id)
      .eq("status", "graded")
      .order("completed_at", { ascending: true }),
  ]);

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

  const writingPoints = (writingResults ?? [])
    .filter((r): r is typeof r & { overall_band: number } => r.overall_band != null)
    .slice(-8)
    .map((r) => ({
      date: new Date(r.completed_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
      band: r.overall_band,
    }));

  const questionResults: QuestionResult[] = (results ?? []).flatMap(
    (r) => (r.question_results_json as QuestionResult[] | null) ?? [],
  );

  const activityDays = (activity ?? []).map((a) => ({
    date: a.date,
    testsCompleted: a.tests_completed,
    wordsReviewed: a.words_reviewed,
  }));

  return (
    <AppShell active="/progress">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Progress</h1>
      <p className="mt-2 text-white/50">Track your band score trend for each test type.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <BandTrendChart title="Reading Band Trend" points={readingPoints} color="accent" gradientId="bp-progress-reading" />
        <BandTrendChart title="Listening Band Trend" points={listeningPoints} color="success" gradientId="bp-progress-listening" />
        <BandTrendChart title="Writing Band Trend" points={writingPoints} color="warning" gradientId="bp-progress-writing" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <AccuracyByType questionResults={questionResults} />
        <ActivityCalendar days={activityDays} />
      </div>
    </AppShell>
  );
}
