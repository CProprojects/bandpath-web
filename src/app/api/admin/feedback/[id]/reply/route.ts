import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminSessionValue } from "@/lib/adminSession";
import { sendTelegramMessage, sendTelegramPhotoFromStorage } from "@/lib/telegram";
import { resolveFeedbackTelegramId } from "@/lib/feedback";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSessionValue(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const { message, photoUrl } = await request.json();

  const trimmed = typeof message === "string" ? message.trim() : "";
  const hasPhoto = typeof photoUrl === "string" && photoUrl.length > 0;

  if (!trimmed && !hasPhoto) {
    return NextResponse.json({ error: "Please enter a reply or attach a photo." }, { status: 400 });
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
    const header = "💬 Reply from the BandPath team:";
    if (hasPhoto) {
      const caption = trimmed ? `${header}\n\n${trimmed}` : header;
      await sendTelegramPhotoFromStorage(
        admin,
        "feedback-media",
        photoUrl,
        targetTelegramId,
        caption.length > 1024 ? caption.slice(0, 1023) + "…" : caption,
      );
    } else {
      await sendTelegramMessage(targetTelegramId, `${header}\n\n${trimmed}`);
    }
  } catch {
    return NextResponse.json({ error: "Couldn't deliver the reply — the user may have blocked the bot." }, { status: 502 });
  }

  const { error } = await admin
    .from("feedback")
    .update({
      reply_message: trimmed || "[Photo attached]",
      reply_photo_url: hasPhoto ? photoUrl : null,
      replied_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
