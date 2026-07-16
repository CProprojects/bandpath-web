import type { SupabaseClient } from "@supabase/supabase-js";

// Resolves the Telegram chat id to reply to for a feedback row: bot-side
// submissions already carry it directly, platform-side submissions need a
// lookup through the linked user (every website account is Telegram-linked,
// since that's the only login method).
export async function resolveFeedbackTelegramId(
  admin: SupabaseClient,
  feedback: { source: string; telegram_id: string | null; user_id: string | null },
): Promise<string | null> {
  if (feedback.source === "telegram" && feedback.telegram_id) {
    return feedback.telegram_id;
  }

  if (feedback.user_id) {
    const { data: user } = await admin
      .from("users")
      .select("telegram_id")
      .eq("id", feedback.user_id)
      .maybeSingle();
    return user?.telegram_id ?? null;
  }

  return null;
}
