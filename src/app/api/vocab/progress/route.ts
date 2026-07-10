import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordVocabProgress } from "@/lib/vocabProgress";

export async function POST(request: Request) {
  const body = await request.json();
  const { wordId, stage, correct } = body as {
    wordId: string;
    stage: "learn" | "quiz" | "spelling";
    correct?: boolean;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const result = await recordVocabProgress(supabase, user.id, { wordId, stage, correct });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
