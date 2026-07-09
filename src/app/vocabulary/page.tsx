import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Zap, CheckCircle, PlayCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getAllVocabTestIds, getWordsForTest, getPartsForTest } from "@/lib/vocab";
import { DAILY_WORD_CAP } from "@/lib/srs";
import { TESTS } from "@/lib/tests";

function progressBarColor(fraction: number) {
  if (fraction >= 0.7) return "from-bp-success to-[#00c8a0]";
  if (fraction >= 0.25) return "from-bp-accent to-[#0098e0]";
  return "from-bp-warning to-[#e08900]";
}

export default async function VocabularyHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: progressRows }] = await Promise.all([
    supabase.from("users").select("streak_count, xp_total").eq("id", user.id).single(),
    supabase.from("vocab_progress").select("word_id, status, next_review_at").eq("user_id", user.id),
  ]);

  const masteredByTest = new Map<string, number>();
  const progressedIds = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);
  let dueCount = 0;
  (progressRows ?? []).forEach((r) => {
    progressedIds.add(r.word_id);
    if (r.status === "mastered") {
      const testId = r.word_id.split(":")[0];
      masteredByTest.set(testId, (masteredByTest.get(testId) ?? 0) + 1);
    }
    if (r.next_review_at <= today) dueCount++;
  });

  const vocabTestIds = getAllVocabTestIds();
  const totalWords = vocabTestIds.reduce((sum, id) => sum + getWordsForTest(id).length, 0);
  const totalMastered = Array.from(masteredByTest.values()).reduce((a, b) => a + b, 0);
  const newCount = totalWords - progressedIds.size;
  const practiceTodayCount = Math.min(dueCount + newCount, DAILY_WORD_CAP);

  return (
    <AppShell active="/vocabulary">
      <div className="relative">
        <div
          className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(0,196,255,.22), transparent 65%)" }}
        />

        <h1 className="text-2xl font-bold text-white md:text-3xl">Vocabulary</h1>

        <div className="relative mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
            <Flame className="bp-flame mx-auto h-5 w-5 text-bp-warning" />
            <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">
              {profile?.streak_count ?? 0}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-white/50">Streak</div>
          </div>
          <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
            <Zap className="mx-auto h-5 w-5 text-bp-warning" />
            <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">
              {profile?.xp_total ?? 0}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-white/50">Total XP</div>
          </div>
          <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
            <CheckCircle className="mx-auto h-5 w-5 text-bp-success" />
            <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">
              {totalMastered}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-white/50">Mastered</div>
          </div>
        </div>

        <Link
          href="/vocabulary/all"
          className="mt-5 flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] text-sm font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)] transition-opacity hover:opacity-90"
        >
          <PlayCircle className="h-5 w-5" />
          Practice Today
          {practiceTodayCount > 0 && (
            <span className="rounded-full bg-[#06243c]/35 px-2.5 py-0.5 text-xs font-bold">
              {practiceTodayCount} words
            </span>
          )}
        </Link>

        <h2 className="mt-8 text-[11px] font-bold uppercase tracking-wider text-white/45">
          Your Test Lists
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {vocabTestIds.map((testId) => {
            const test = TESTS.find((t) => t.id === testId);
            const words = getWordsForTest(testId);
            const parts = getPartsForTest(testId).length;
            const mastered = masteredByTest.get(testId) ?? 0;
            const fraction = words.length ? mastered / words.length : 0;
            return (
              <Link
                key={testId}
                href={`/vocabulary/${testId}`}
                className="rounded-2xl border border-bp-border bg-bp-card/60 p-4 transition-colors hover:border-bp-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white">{test?.title ?? testId}</div>
                    <div className="mt-0.5 text-xs text-white/45">
                      {words.length} words · {parts} parts
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs font-bold text-bp-success">
                      {mastered} / {words.length}
                    </div>
                    <div className="text-[10px] text-white/40">mastered</div>
                  </div>
                </div>
                <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressBarColor(fraction)}`}
                    style={{ width: `${Math.max(fraction * 100, words.length ? 2 : 0)}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
