import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
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
      .select("name, full_name, telegram_id, plan, xp_total, streak_count, created_at")
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

      <div className="mt-6 rounded-2xl border border-bp-border bg-bp-card p-6">
        <div className="text-xl font-bold text-white">
          {profile?.name || profile?.full_name || "BandPath User"}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {profile?.telegram_id && (
            <span className="rounded-full bg-[#229ED9]/15 px-3 py-1 font-semibold text-[#5fc4ef]">
              Telegram ID: {profile.telegram_id}
            </span>
          )}
          <span className="rounded-full bg-bp-accent/15 px-3 py-1 font-semibold text-bp-accent">
            {profile?.plan === "pro" ? "Pro" : "Free"} plan
          </span>
          {profile?.created_at && (
            <span className="rounded-full bg-white/5 px-3 py-1 font-semibold text-white/40">
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-bp-warning">{profile?.xp_total ?? 0}</div>
          <div className="mt-1 text-xs text-white/40">total XP</div>
        </div>
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-bp-accent">{profile?.streak_count ?? 0}</div>
          <div className="mt-1 text-xs text-white/40">day streak</div>
        </div>
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-bp-success">{testResults.length}</div>
          <div className="mt-1 text-xs text-white/40">tests taken</div>
        </div>
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {masteredWords}/{totalWords}
          </div>
          <div className="mt-1 text-xs text-white/40">words mastered</div>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/40">
        {readingCount} reading · {listeningCount} listening
      </p>

      <h2 className="mt-10 text-lg font-bold text-white">Test History</h2>
      {testResults.length === 0 ? (
        <p className="mt-3 text-sm text-white/40">
          No tests taken yet.{" "}
          <Link href="/tests" className="text-bp-accent">
            Start one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {testResults.map((r) => {
            const test = getTestById(r.test_id);
            return (
              <Link
                key={r.id}
                href={`/results/${r.id}`}
                className="flex items-center justify-between rounded-2xl border border-bp-border bg-bp-card p-4 transition-colors hover:border-bp-accent/40"
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
    </AppShell>
  );
}
