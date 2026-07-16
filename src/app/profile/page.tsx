import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap, Flame, FileCheck2, GraduationCap, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GoalForm } from "@/components/GoalForm";
import { ContactForm } from "@/components/ContactForm";
import { createClient } from "@/lib/supabase/server";
import { getTestById } from "@/lib/tests";
import { getAllVocabTestIds, getWordsForTest } from "@/lib/vocab";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: results }, { data: vocabProgress }] = await Promise.all([
    supabase
      .from("users")
      .select("name, full_name, telegram_id, plan, xp_total, streak_count, created_at, exam_date, target_band")
      .eq("id", user.id)
      .single(),
    supabase
      .from("test_results")
      .select("id, test_id, test_type, score_band, score_raw, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false }),
    supabase.from("vocab_progress").select("status").eq("user_id", user.id),
  ]);

  const totalWords = getAllVocabTestIds().reduce((sum, id) => sum + getWordsForTest(id).length, 0);
  const masteredWords = (vocabProgress ?? []).filter((r) => r.status === "mastered").length;

  const testResults = results ?? [];
  const readingCount = testResults.filter((r) => r.test_type === "reading").length;
  const listeningCount = testResults.filter((r) => r.test_type === "listening").length;

  return (
    <AppShell active="/profile">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Profile</h1>

      <div className="mt-6 rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/10 to-bp-card/70 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-bp-accent/25 to-bp-accent/5 text-bp-accent">
            <User className="h-7 w-7" />
          </div>
          <div className="text-xl font-bold text-white">
            {profile?.name || profile?.full_name || "BandPath User"}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {profile?.telegram_id && (
            <span className="rounded-full bg-[#229ED9]/15 px-3 py-1 font-semibold text-[#5fc4ef]">
              Telegram ID: {profile.telegram_id}
            </span>
          )}
          <span className="rounded-full bg-bp-accent/15 px-3 py-1 font-semibold text-bp-accent">
            {profile?.plan === "pro" ? "Pro" : "Standard"} plan
          </span>
          {profile?.created_at && (
            <span className="rounded-full bg-white/5 px-3 py-1 font-semibold text-white/40">
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
          <Zap className="mx-auto h-5 w-5 text-bp-warning" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">
            {profile?.xp_total ?? 0}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Total XP</div>
        </div>
        <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
          <Flame className="bp-flame mx-auto h-5 w-5 text-bp-warning" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">
            {profile?.streak_count ?? 0}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Day Streak</div>
        </div>
        <div className="rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/15 to-bp-card/60 p-4 text-center">
          <FileCheck2 className="mx-auto h-5 w-5 text-bp-accent" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-accent">
            {testResults.length}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Tests Taken</div>
        </div>
        <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
          <GraduationCap className="mx-auto h-5 w-5 text-bp-success" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">
            {masteredWords}/{totalWords}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Words Mastered</div>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/40">
        {readingCount} reading · {listeningCount} listening
      </p>

      <div className="mt-6">
        <GoalForm initialExamDate={profile?.exam_date ?? null} initialTargetBand={profile?.target_band ?? null} />
      </div>

      <h2 className="mt-8 text-[11px] font-bold uppercase tracking-wider text-white/45">
        Test History
      </h2>
      {testResults.length === 0 ? (
        <p className="mt-3 text-sm text-white/40">
          No tests taken yet.{" "}
          <Link href="/tests" className="text-bp-accent">
            Start one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {testResults.map((r) => {
            const test = getTestById(r.test_id);
            return (
              <Link
                key={r.id}
                href={`/results/${r.id}`}
                className="flex items-center justify-between rounded-2xl border border-bp-border bg-bp-card/60 p-4 transition-colors hover:border-bp-accent/40"
              >
                <div>
                  <div className="font-semibold text-white">{test?.title ?? r.test_id}</div>
                  <div className="mt-1 text-xs text-white/40">
                    {new Date(r.completed_at).toLocaleDateString()} · {r.score_raw ?? 0}/40 correct
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

      <div className="mt-6">
        <ContactForm />
      </div>
    </AppShell>
  );
}
