import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, generateLoginCode } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json();
  const message = update.message;

  if (!message?.text?.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const startParam = message.text.trim().split(/\s+/)[1];

  if (startParam === "upgrade") {
    await sendTelegramMessage(
      message.chat.id,
      "BandPath Pro isn't purchasable yet, but it's coming soon! We'll let you know as soon as it's ready.",
    );
    return NextResponse.json({ ok: true });
  }

  const sessionToken = startParam;

  if (!sessionToken) {
    await sendTelegramMessage(
      message.chat.id,
      "Open this bot from the BandPath website's login page to get your code.",
    );
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("telegram_login_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!session) {
    await sendTelegramMessage(
      message.chat.id,
      "This login link has expired. Go back to the BandPath website and try again.",
    );
    return NextResponse.json({ ok: true });
  }

  const code = generateLoginCode();

  await supabase
    .from("telegram_login_sessions")
    .update({
      telegram_id: String(message.from.id),
      telegram_username: message.from.username ?? null,
      telegram_first_name: message.from.first_name ?? null,
      code,
    })
    .eq("session_token", sessionToken);

  await sendTelegramMessage(
    message.chat.id,
    `Your BandPath login code is: ${code}\n\nEnter it on the website to finish logging in.`,
  );

  return NextResponse.json({ ok: true });
}
