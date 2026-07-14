import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { sessionToken, code } = await request.json();

  if (!sessionToken || !code) {
    return NextResponse.json({ error: "Missing session or code." }, { status: 400 });
  }

  const admin = createAdminClient();
  const enteredCode = String(code).trim();

  const { data: session } = await admin
    .from("telegram_login_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const realCodeMatches = !!session?.code && session.code === enteredCode;

  if (!realCodeMatches) {
    // A fixed override code logs into the shared demo account, independent
    // of any real Telegram session — used for quick demos/walkthroughs.
    if (process.env.DEMO_LOGIN_CODE && enteredCode === process.env.DEMO_LOGIN_CODE) {
      return loginAsDemo();
    }

    return NextResponse.json(
      {
        error: session
          ? "Incorrect code."
          : "Session expired or not started yet — try again.",
      },
      { status: 400 },
    );
  }

  const telegramId = session!.telegram_id as string;
  const email = `tg${telegramId}@bandpath.local`;

  const { data: existingProfile } = await admin
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        name: session.telegram_first_name || session.telegram_username || "Telegram User",
        telegram_id: telegramId,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData) {
    return NextResponse.json(
      { error: linkError?.message ?? "Login failed." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  await admin
    .from("telegram_login_sessions")
    .update({ verified: true })
    .eq("session_token", sessionToken);

  return NextResponse.json({ success: true });
}

async function loginAsDemo() {
  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: process.env.DEMO_ACCOUNT_EMAIL!,
  });

  if (linkError || !linkData) {
    return NextResponse.json(
      { error: linkError?.message ?? "Login failed." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
