import type { SupabaseClient } from "@supabase/supabase-js";
import { VOCAB_WORDS, getWordsForTest, getPart, getWordById, type VocabWord } from "@/lib/vocab";
import { nextReviewState } from "@/lib/srs";
import { recordDailyActivity } from "@/lib/activity";
import { DAILY_WORD_CAP } from "@/lib/srs";

const XP_PER_WORD = 2;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Same distractor logic as QuizStage in VocabSession.tsx: 3 random other
// words from the same session pool + the correct word, shuffled together.
export function buildQuizOptions(pool: VocabWord[], word: VocabWord): VocabWord[] {
  const others = shuffle(pool.filter((x) => x.id !== word.id)).slice(0, 3);
  return shuffle([word, ...others]);
}

export async function getVocabSessionWords(
  supabase: SupabaseClient,
  userId: string,
  { testId, part }: { testId?: string; part?: number } = {},
) {
  // A specific part was requested: return that exact batch of 6-8 words,
  // no SRS filtering — this is deliberate, replayable practice by part.
  if (testId && part !== undefined) {
    const words = getPart(testId, part) ?? [];
    return { words, dueCount: 0, newCount: words.length, totalInPool: words.length };
  }

  const pool = testId ? getWordsForTest(testId) : VOCAB_WORDS;
  const today = new Date().toISOString().slice(0, 10);

  const { data: progressRows } = await supabase
    .from("vocab_progress")
    .select("word_id, status, next_review_at")
    .eq("user_id", userId);

  const progressMap = new Map((progressRows ?? []).map((r) => [r.word_id, r]));

  const poolIds = new Set(pool.map((w) => w.id));
  const due = (progressRows ?? [])
    .filter((r) => poolIds.has(r.word_id) && r.next_review_at <= today)
    .map((r) => pool.find((w) => w.id === r.word_id))
    .filter((w): w is NonNullable<typeof w> => !!w);

  const fresh = pool.filter((w) => !progressMap.has(w.id));

  const words = [...due, ...fresh].slice(0, DAILY_WORD_CAP);

  return { words, dueCount: due.length, newCount: fresh.length, totalInPool: pool.length };
}

export async function recordVocabProgress(
  supabase: SupabaseClient,
  userId: string,
  { wordId, stage, correct }: { wordId: string; stage: "learn" | "quiz" | "spelling"; correct?: boolean },
) {
  if (!wordId || !stage || !getWordById(wordId)) {
    return { error: "Invalid word." as const };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("vocab_progress")
    .select("status, interval_days, correct_count, wrong_count, xp_awarded")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  if (stage === "learn" || stage === "quiz") {
    if (!existing) {
      await supabase.from("vocab_progress").insert({
        user_id: userId,
        word_id: wordId,
        status: "learning",
        interval_days: 0,
        next_review_at: today,
      });
    }
    // No XP here — a word only pays out once, on first full completion
    // (see the "spelling" branch below), so redoing a part for practice
    // doesn't let students farm XP on words they already know.
    return { ok: true as const, xpAwarded: 0 };
  }

  // stage === "spelling" — the last step of a word; this is also the
  // authoritative SRS checkpoint that reschedules the next review.
  const current = {
    status: (existing?.status ?? "learning") as "learning" | "review" | "mastered",
    intervalDays: existing?.interval_days ?? 0,
    correctCount: existing?.correct_count ?? 0,
    wrongCount: existing?.wrong_count ?? 0,
  };

  const next = nextReviewState(current, !!correct);
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + next.nextReviewInDays);

  const alreadyAwarded = existing?.xp_awarded ?? false;
  // A word only pays out XP the first time it's answered CORRECTLY — a
  // skipped or wrong attempt does not spend that word's one-time XP, so
  // the student can come back, get it right, and still earn it.
  const xpAwarded = !alreadyAwarded && correct ? XP_PER_WORD : 0;

  await supabase.from("vocab_progress").upsert(
    {
      user_id: userId,
      word_id: wordId,
      status: next.status,
      interval_days: next.intervalDays,
      correct_count: next.correctCount,
      wrong_count: next.wrongCount,
      next_review_at: nextReviewAt.toISOString().slice(0, 10),
      last_reviewed_at: new Date().toISOString(),
      xp_awarded: alreadyAwarded || !!correct,
    },
    { onConflict: "user_id,word_id" },
  );
  const activity = await recordDailyActivity(supabase, userId, {
    xpDelta: xpAwarded,
    wordsReviewed: 1,
  });

  return {
    ok: true as const,
    xpAwarded,
    streakCount: activity.streakCount,
    status: next.status,
  };
}
