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

// Formats a "who sent this" line for admin notifications — always shows a
// name (platform name if registered, else Telegram @username) together with
// the numeric Telegram ID, so the admin can identify AND reach the sender
// straight from the message, not just one or the other.
export function formatContactSender({
  name,
  username,
  telegramId,
}: {
  name?: string | null;
  username?: string | null;
  telegramId?: string | null;
}): string {
  const parts: string[] = [];
  if (name) parts.push(name);
  else if (username) parts.push(`@${username}`);
  if (telegramId) parts.push(`Telegram ID ${telegramId}`);
  return parts.length ? parts.join(" · ") : "Unknown sender";
}
