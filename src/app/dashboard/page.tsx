import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Zap, FileCheck2, TrendingUp, PlayCircle, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTestById, TESTS } from "@/lib/tests";
import { getAllVocabTestIds, getWordsForTest } from "@/lib/vocab";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: results }, { data: allResults }, { data: vocabProgress }] =
    await Promise.all([
      supabase
        .from("users")
        .select("name, plan, streak_count, xp_total")
        .eq("id", user.id)
        .single(),
      supabase
        .from("test_results")
        .select("id, test_id, score_band, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(3),
      supabase.from("test_results").select("test_id").eq("user_id", user.id),
      supabase.from("vocab_progress").select("status").eq("user_id", user.id),
    ]);

  const bands = (results ?? []).map((r) => r.score_band).filter((b): b is number => b != null);
  const bestBand = bands.length ? Math.max(...bands) : null;

  const testsCompleted = new Set((allResults ?? []).map((r) => r.test_id)).size;
  const totalTests = TESTS.length;

  const totalWords = getAllVocabTestIds().reduce((sum, id) => sum + getWordsForTest(id).length, 0);
  const masteredWords = (vocabProgress ?? []).filter((r) => r.status === "mastered").length;

  return (
    <AppShell active="/dashboard">
      <h1 className="text-2xl font-bold text-white md:text-3xl">
        Welcome back, {profile?.name || "there"}!
      </h1>
      <p className="mt-2 text-white/50">Keep the streak alive — a little practice every day adds up.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
          <Flame className="bp-flame mx-auto h-5 w-5 text-bp-warning" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">
            {profile?.streak_count ?? 0}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Day Streak</div>
        </div>
        <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
          <Zap className="mx-auto h-5 w-5 text-bp-warning" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">
            {profile?.xp_total ?? 0}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Total XP</div>
        </div>
        <div className="rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/15 to-bp-card/60 p-4 text-center">
          <FileCheck2 className="mx-auto h-5 w-5 text-bp-accent" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-accent">
            {results?.length ?? 0}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Tests Taken</div>
        </div>
        <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-bp-success" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">
            {bestBand?.toFixed(1) ?? "—"}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Best Band</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/tests"
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] p-4 font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)] transition-opacity hover:opacity-90"
        >
          <PlayCircle className="h-6 w-6" />
          Take a Test
        </Link>
        <Link
          href="/vocabulary/all"
          className="flex items-center gap-3 rounded-2xl border border-bp-border bg-bp-card/60 p-4 font-bold text-white transition-colors hover:border-bp-accent/40"
        >
          <BookOpen className="h-6 w-6 text-bp-accent" />
          Practice Vocabulary
        </Link>
      </div>

      <h2 className="mt-8 text-[11px] font-bold uppercase tracking-wider text-white/45">
        Your Progress
      </h2>
      <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-bp-border bg-bp-card/60 p-5">
        <ProgressBar
          icon={FileCheck2}
          color="bp-accent"
          label="Tests Completed"
          value={testsCompleted}
          total={totalTests}
        />
        <ProgressBar
          icon={BookOpen}
          color="bp-success"
          label="Words Mastered"
          value={masteredWords}
          total={totalWords}
        />
      </div>

      <h2 className="mt-8 text-[11px] font-bold uppercase tracking-wider text-white/45">
        Recent Activity
      </h2>
      {!results || results.length === 0 ? (
        <p className="mt-3 text-sm text-white/40">
          No tests taken yet.{" "}
          <Link href="/tests" className="text-bp-accent">
            Start one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {results.map((r) => {
            const test = getTestById(r.test_id);
            return (
              <Link
                key={r.id}
                href={`/results/${r.id}`}
                className="flex items-center justify-between rounded-2xl border border-bp-border bg-bp-card/60 p-4 transition-colors hover:border-bp-accent/40"
              >
                <div>
                  <div className="font-semibold text-white">{test?.title ?? r.test_id}</div>
                  <div className="mt-0.5 text-xs text-white/40">
                    {new Date(r.completed_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-lg font-bold text-bp-success">
                  {r.score_band?.toFixed(1) ?? "—"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function ProgressBar({
  icon: Icon,
  color,
  label,
  value,
  total,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "bp-accent" | "bp-success";
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const styles =
    color === "bp-accent"
      ? { text: "text-bp-accent", bar: "bg-gradient-to-r from-bp-accent to-[#0098e0]", glow: "rgba(0,196,255,0.7)" }
      : { text: "text-bp-success", bar: "bg-gradient-to-r from-bp-success to-[#1fb85f]", glow: "rgba(46,213,115,0.7)" };

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-white/70">
          <Icon className={`h-3.5 w-3.5 ${styles.text}`} />
          {label}
        </span>
        <span className={`font-bold ${styles.text}`}>
          {value}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all ${styles.bar}`}
          style={{ width: `${pct}%`, boxShadow: `0 0 10px 0 ${styles.glow}` }}
        />
      </div>
    </div>
  );
}
