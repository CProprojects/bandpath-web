import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VOCAB_WORDS, getWordsForTest } from "@/lib/vocab";
import { DAILY_WORD_CAP } from "@/lib/srs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId") ?? undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const pool = testId ? getWordsForTest(testId) : VOCAB_WORDS;
  const today = new Date().toISOString().slice(0, 10);

  const { data: progressRows } = await supabase
    .from("vocab_progress")
    .select("word_id, status, next_review_at")
    .eq("user_id", user.id);

  const progressMap = new Map((progressRows ?? []).map((r) => [r.word_id, r]));

  const poolIds = new Set(pool.map((w) => w.id));
  const due = (progressRows ?? [])
    .filter((r) => poolIds.has(r.word_id) && r.next_review_at <= today)
    .map((r) => pool.find((w) => w.id === r.word_id))
    .filter((w): w is NonNullable<typeof w> => !!w);

  const fresh = pool.filter((w) => !progressMap.has(w.id));

  const words = [...due, ...fresh].slice(0, DAILY_WORD_CAP);

  return NextResponse.json({
    words,
    dueCount: due.length,
    newCount: fresh.length,
    totalInPool: pool.length,
  });
}
