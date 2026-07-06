import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWordById } from "@/lib/vocab";
import { nextReviewState } from "@/lib/srs";
import { recordDailyActivity } from "@/lib/activity";

const XP_PER_WORD = 2;

export async function POST(request: Request) {
  const body = await request.json();
  const { wordId, stage, correct } = body as {
    wordId: string;
    stage: "learn" | "quiz" | "spelling";
    correct?: boolean;
  };

  if (!wordId || !stage || !getWordById(wordId)) {
    return NextResponse.json({ error: "Invalid word." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("vocab_progress")
    .select("status, interval_days, correct_count, wrong_count, xp_awarded")
    .eq("user_id", user.id)
    .eq("word_id", wordId)
    .maybeSingle();

  if (stage === "learn" || stage === "quiz") {
    if (!existing) {
      await supabase.from("vocab_progress").insert({
        user_id: user.id,
        word_id: wordId,
        status: "learning",
        interval_days: 0,
        next_review_at: today,
      });
    }
    // No XP here — a word only pays out once, on first full completion
    // (see the "spelling" branch below), so redoing a part for practice
    // doesn't let students farm XP on words they already know.
    return NextResponse.json({ ok: true, xpAwarded: 0 });
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
      user_id: user.id,
      word_id: wordId,
      status: next.status,
      interval_days: next.intervalDays,
      correct_count: next.correctCount,
      wrong_count: next.wrongCount,
      next_review_at: nextReviewAt.toISOString().slice(0, 10),
      last_reviewed_at: new Date().toISOString(),
      xp_awarded: alreadyAwarded || !!correct,
    },
    { onConflict: "user_id,word_id" }
  );
  const activity = await recordDailyActivity(supabase, user.id, {
    xpDelta: xpAwarded,
    wordsReviewed: 1,
  });

  return NextResponse.json({ ok: true, xpAwarded, streakCount: activity.streakCount });
}
