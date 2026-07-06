import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSessionToken } from "@/lib/telegram";

export async function POST() {
  const supabase = createAdminClient();
  const sessionToken = generateSessionToken();

  const { error } = await supabase
    .from("telegram_login_sessions")
    .insert({ session_token: sessionToken });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const deepLink = `https://t.me/${botUsername}?start=${sessionToken}`;

  return NextResponse.json({ sessionToken, deepLink });
}
