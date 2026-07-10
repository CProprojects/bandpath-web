import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export async function POST(request: Request) {
  const { examDate, targetBand } = await request.json();

  if (examDate) {
    const parsed = new Date(examDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid exam date." }, { status: 400 });
    }
  }

  if (targetBand !== null && targetBand !== undefined && !VALID_BANDS.includes(Number(targetBand))) {
    return NextResponse.json({ error: "Invalid target band." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      exam_date: examDate || null,
      target_band: targetBand !== undefined ? targetBand : null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
