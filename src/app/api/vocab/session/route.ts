import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVocabSessionWords } from "@/lib/vocabProgress";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId") ?? undefined;
  const partParam = searchParams.get("part");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const result = await getVocabSessionWords(supabase, user.id, {
    testId,
    part: partParam !== null ? Number(partParam) : undefined,
  });

  return NextResponse.json(result);
}
