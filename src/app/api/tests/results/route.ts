import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordDailyActivity } from "@/lib/activity";

export async function POST(request: Request) {
  const body = await request.json();
  const { testId, testType, scoreRaw, scoreBand, timeSpentSeconds, answers, questionResults } = body;

  if (!testId || !testType) {
    return NextResponse.json({ error: "Missing test data." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("test_results")
    .insert({
      user_id: user.id,
      test_id: testId,
      test_type: testType,
      score_raw: scoreRaw,
      score_band: scoreBand,
      time_spent_seconds: timeSpentSeconds,
      answers_json: answers,
      question_results_json: questionResults ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordDailyActivity(supabase, user.id, { testCompleted: true, xpDelta: 30 });

  return NextResponse.json({ id: data.id });
}
