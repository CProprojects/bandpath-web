import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminSessionValue } from "@/lib/adminSession";
import { sendTelegramMessage } from "@/lib/telegram";
import { resolveFeedbackTelegramId } from "@/lib/feedback";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSessionValue(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const { message } = await request.json();

  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ error: "Please enter a reply." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: feedback } = await admin.from("feedback").select("*").eq("id", id).maybeSingle();
  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  const targetTelegramId = await resolveFeedbackTelegramId(admin, feedback);
  if (!targetTelegramId) {
    return NextResponse.json({ error: "No linked Telegram account for this submission." }, { status: 400 });
  }

  try {
    await sendTelegramMessage(targetTelegramId, `💬 Reply from the BandPath team:\n\n${trimmed}`);
  } catch {
    return NextResponse.json({ error: "Couldn't deliver the reply — the user may have blocked the bot." }, { status: 502 });
  }

  const { error } = await admin
    .from("feedback")
    .update({ reply_message: trimmed, replied_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
