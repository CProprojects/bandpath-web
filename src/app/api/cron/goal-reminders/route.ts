import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

// Runs once daily via Vercel Cron (see vercel.json). Nudges users who have
// set an exam date but haven't practiced yet today — skipped entirely once
// the exam date has passed (no more "days left" to count down).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: users, error } = await admin
    .from("users")
    .select("id, telegram_id, exam_date, target_band, name")
    .not("telegram_id", "is", null)
    .not("exam_date", "is", null)
    .gte("exam_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: activeToday } = await admin
    .from("daily_activity")
    .select("user_id, tests_completed, words_reviewed")
    .eq("date", today);

  const activeUserIds = new Set(
    (activeToday ?? [])
      .filter((a) => a.tests_completed > 0 || a.words_reviewed > 0)
      .map((a) => a.user_id),
  );

  let sent = 0;
  let skippedActive = 0;
  let failed = 0;

  for (const user of users ?? []) {
    if (activeUserIds.has(user.id)) {
      skippedActive++;
      continue;
    }

    const daysLeft = Math.round(
      (new Date(user.exam_date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) /
        (24 * 60 * 60 * 1000),
    );

    const dayWord = daysLeft === 1 ? "day" : "days";
    const targetLine = user.target_band ? `\n🎯 Target: Band ${Number(user.target_band).toFixed(1)}` : "";
    const message =
      daysLeft === 0
        ? `📅 Your exam is today! Good luck — you've got this.${targetLine}`
        : `⏰ ${daysLeft} ${dayWord} until your exam — let's continue/finish a test today.${targetLine}\n\nSend /vocab to practice, or open the website to take a test.`;

    try {
      await sendTelegramMessage(user.telegram_id!, message);
      sent++;
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }

  return NextResponse.json({ sent, skippedActive, failed, total: users?.length ?? 0 });
}
