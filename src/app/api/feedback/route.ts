import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, sendTelegramPhoto, type InlineKeyboard } from "@/lib/telegram";

export async function POST(request: Request) {
  const { type, message, photoUrl } = await request.json();

  const contactType = type === "report" ? "report" : "feedback";

  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
  }
  if (trimmed.length > 4000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from("feedback")
    .insert({
      source: "platform",
      type: contactType,
      user_id: user.id,
      message: trimmed,
      photo_url: typeof photoUrl === "string" && photoUrl ? photoUrl : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort notification — the row above is already the source of
  // truth, so a Telegram failure here must not fail the request.
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (adminChatId) {
    try {
      const { data: profile } = await admin
        .from("users")
        .select("name, full_name")
        .eq("id", user.id)
        .maybeSingle();
      const who = profile?.name || profile?.full_name || user.email || "a BandPath user";
      const label = contactType === "report" ? "🐛 Problem Report" : "💬 Feedback";
      const caption = `${label} (Platform) from ${who}:\n\n${trimmed}`;
      const replyMarkup: InlineKeyboard = {
        inline_keyboard: [[{ text: "↩️ Reply", callback_data: `reply:${inserted.id}` }]],
      };

      if (typeof photoUrl === "string" && photoUrl) {
        await sendTelegramPhoto(
          adminChatId,
          photoUrl,
          caption.length > 1024 ? caption.slice(0, 1023) + "…" : caption,
          { replyMarkup },
        );
      } else {
        await sendTelegramMessage(adminChatId, caption, { replyMarkup });
      }
    } catch (e) {
      console.error("[feedback] Telegram notify failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
