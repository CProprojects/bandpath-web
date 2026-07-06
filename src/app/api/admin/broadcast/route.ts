import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminTelegramId } from "@/lib/admin";
import { sendTelegramMessage } from "@/lib/telegram";

// Sequential sends at ~25/sec; fine for hundreds of users within the
// function's max duration. A much larger list would need a background queue.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { message } = await request.json();

  if (!message || !String(message).trim()) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("telegram_id")
    .eq("id", user.id)
    .single();

  if (!isAdminTelegramId(profile?.telegram_id)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { data: recipients, error } = await admin
    .from("users")
    .select("telegram_id")
    .not("telegram_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  // Telegram allows ~30 messages/sec across all chats; a small delay between
  // sends keeps a broadcast well under that limit. Fine at current user
  // counts — a large user base would need a background job queue instead.
  for (const { telegram_id } of recipients) {
    try {
      await sendTelegramMessage(telegram_id!, message);
      sent++;
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }

  return NextResponse.json({ sent, failed, total: recipients.length });
}
