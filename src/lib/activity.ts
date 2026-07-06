import type { SupabaseClient } from "@supabase/supabase-js";

type ActivityDelta = {
  xpDelta?: number;
  testCompleted?: boolean;
  wordsReviewed?: number;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z");
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return d.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordDailyActivity(
  supabase: SupabaseClient,
  userId: string,
  { xpDelta = 0, testCompleted = false, wordsReviewed = 0 }: ActivityDelta
) {
  const today = todayStr();

  const { data: profile } = await supabase
    .from("users")
    .select("streak_count, last_active_at, xp_total")
    .eq("id", userId)
    .single();

  const lastActiveDate = profile?.last_active_at
    ? new Date(profile.last_active_at).toISOString().slice(0, 10)
    : null;

  let streakCount = profile?.streak_count ?? 0;
  if (lastActiveDate === today) {
    // already active today, streak unchanged
  } else if (lastActiveDate && isYesterday(lastActiveDate)) {
    streakCount += 1;
  } else {
    streakCount = 1;
  }

  await supabase
    .from("users")
    .update({
      streak_count: streakCount,
      last_active_at: new Date().toISOString(),
      xp_total: (profile?.xp_total ?? 0) + xpDelta,
    })
    .eq("id", userId);

  const { data: existing } = await supabase
    .from("daily_activity")
    .select("tests_completed, words_reviewed, xp_earned")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  await supabase.from("daily_activity").upsert(
    {
      user_id: userId,
      date: today,
      tests_completed: (existing?.tests_completed ?? 0) + (testCompleted ? 1 : 0),
      words_reviewed: (existing?.words_reviewed ?? 0) + wordsReviewed,
      xp_earned: (existing?.xp_earned ?? 0) + xpDelta,
    },
    { onConflict: "user_id,date" }
  );

  return { streakCount, xpTotal: (profile?.xp_total ?? 0) + xpDelta };
}
