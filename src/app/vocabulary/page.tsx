import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getAllVocabTestIds, getWordsForTest } from "@/lib/vocab";
import { TESTS } from "@/lib/tests";

export default async function VocabularyHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("streak_count, xp_total")
    .eq("id", user.id)
    .single();

  const { data: progressRows } = await supabase
    .from("vocab_progress")
    .select("word_id, status")
    .eq("user_id", user.id);

  const masteredByTest = new Map<string, number>();
  (progressRows ?? []).forEach((r) => {
    if (r.status !== "mastered") return;
    const testId = r.word_id.split(":")[0];
    masteredByTest.set(testId, (masteredByTest.get(testId) ?? 0) + 1);
  });

  const vocabTestIds = getAllVocabTestIds();
  const totalWords = vocabTestIds.reduce((sum, id) => sum + getWordsForTest(id).length, 0);
  const totalMastered = Array.from(masteredByTest.values()).reduce((a, b) => a + b, 0);

  return (
    <AppShell active="/vocabulary">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Vocabulary</h1>
      <p className="mt-2 text-white/50">Learn the words that actually show up in your tests.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-bp-accent">{profile?.streak_count ?? 0}</div>
          <div className="mt-1 text-xs text-white/40">day streak</div>
        </div>
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-bp-warning">{profile?.xp_total ?? 0}</div>
          <div className="mt-1 text-xs text-white/40">total XP</div>
        </div>
        <div className="rounded-2xl border border-bp-border bg-bp-card p-4 text-center">
          <div className="text-2xl font-bold text-bp-success">
            {totalMastered}/{totalWords}
          </div>
          <div className="mt-1 text-xs text-white/40">words mastered</div>
        </div>
      </div>

      <Link
        href="/vocabulary/all"
        className="mt-6 flex items-center justify-center rounded-2xl bg-bp-accent px-6 py-4 text-base font-bold text-[#06243c] transition-opacity hover:opacity-90"
      >
        Practice Today
      </Link>

      <h2 className="mt-10 text-lg font-bold text-white">By Test</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {vocabTestIds.map((testId) => {
          const test = TESTS.find((t) => t.id === testId);
          const words = getWordsForTest(testId);
          const mastered = masteredByTest.get(testId) ?? 0;
          return (
            <Link
              key={testId}
              href={`/vocabulary/${testId}`}
              className="flex items-center justify-between rounded-2xl border border-bp-border bg-bp-card p-4 transition-colors hover:border-bp-accent/40"
            >
              <div>
                <div className="font-semibold text-white">{test?.title ?? testId}</div>
                <div className="mt-1 text-xs text-white/40">{words.length} words</div>
              </div>
              <div className="font-bold text-bp-success">
                {mastered}/{words.length}
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
