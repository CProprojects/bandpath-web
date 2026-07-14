import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordDailyActivity } from "@/lib/activity";
import { getWritingTestById } from "@/lib/writingTests";
import { gradeWritingSubmission, computeOverallBand } from "@/lib/writingGrading";

// Grading involves an LLM call with adaptive thinking at high effort, which
// can take well past Vercel's default function timeout.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const { testId, task1Response, task2Response, task1WordCount, task2WordCount, timeSpentSeconds } = body;

  if (!testId || task1Response == null || task2Response == null) {
    return NextResponse.json({ error: "Missing submission data." }, { status: 400 });
  }

  const test = getWritingTestById(testId);
  if (!test) {
    return NextResponse.json({ error: "Unknown writing test." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { data: submission, error: insertError } = await supabase
    .from("writing_submissions")
    .insert({
      user_id: user.id,
      test_id: testId,
      task1_response: task1Response,
      task2_response: task2Response,
      task1_word_count: task1WordCount ?? 0,
      task2_word_count: task2WordCount ?? 0,
      time_spent_seconds: timeSpentSeconds ?? null,
      status: "grading",
    })
    .select("id")
    .single();

  if (insertError || !submission) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to save submission." }, { status: 500 });
  }

  try {
    const result = await gradeWritingSubmission({ test, task1Response, task2Response });
    const { task1Band, task2Band, overallBand } = computeOverallBand(result);

    await supabase
      .from("writing_submissions")
      .update({
        status: "graded",
        task1_band: task1Band,
        task2_band: task2Band,
        overall_band: overallBand,
        task1_feedback: result.task1,
        task2_feedback: result.task2,
        graded_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    await recordDailyActivity(supabase, user.id, { testCompleted: true, xpDelta: 40 });

    return NextResponse.json({ id: submission.id, status: "graded" });
  } catch (err) {
    console.error("[writing] grading failed:", err);
    await supabase.from("writing_submissions").update({ status: "failed" }).eq("id", submission.id);
    return NextResponse.json({ error: "Grading failed. Please try submitting again." }, { status: 500 });
  }
}
