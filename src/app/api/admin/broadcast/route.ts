import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminSessionValue } from "@/lib/adminSession";
import { sendTelegramMessage, sendTelegramPhotoBuffer, type InlineKeyboard } from "@/lib/telegram";

// Sequential sends at ~25/sec; fine for hundreds of users within the
// function's max duration. A much larger list would need a background queue.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!verifyAdminSessionValue(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { message, photoUrl, buttonText, buttonUrl } = await request.json();

  if (!message || !String(message).trim()) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  if ((buttonText && !buttonUrl) || (buttonUrl && !buttonText)) {
    return NextResponse.json({ error: "Button text and URL must be set together." }, { status: 400 });
  }

  if (photoUrl && String(message).length > 1024) {
    return NextResponse.json({ error: "Caption can't exceed 1024 characters when a photo is attached." }, { status: 400 });
  }

  const replyMarkup: InlineKeyboard | undefined =
    buttonText && buttonUrl ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] } : undefined;

  const admin = createAdminClient();

  const { data: recipients, error } = await admin
    .from("users")
    .select("telegram_id")
    .not("telegram_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Telegram's sendPhoto-by-URL can't fetch from Supabase Storage directly
  // (its CDN blocks Telegram's fetcher), so the photo is downloaded once
  // here and re-sent as a buffer per recipient instead of a URL.
  let photoBuffer: Buffer | null = null;
  let photoFilename = "photo.jpg";
  if (photoUrl) {
    const path = String(photoUrl).split("/broadcast-media/")[1];
    if (path) {
      const { data, error: downloadError } = await admin.storage.from("broadcast-media").download(path);
      if (!downloadError && data) {
        photoBuffer = Buffer.from(await data.arrayBuffer());
        photoFilename = path.split("/").pop() || "photo.jpg";
      }
    }
  }

  let sent = 0;
  let failed = 0;

  // Telegram allows ~30 messages/sec across all chats; a small delay between
  // sends keeps a broadcast well under that limit. Fine at current user
  // counts — a large user base would need a background job queue instead.
  for (const { telegram_id } of recipients) {
    try {
      if (photoBuffer) {
        await sendTelegramPhotoBuffer(telegram_id!, photoBuffer, photoFilename, message, { replyMarkup });
      } else {
        await sendTelegramMessage(telegram_id!, message, { replyMarkup });
      }
      sent++;
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }

  return NextResponse.json({ sent, failed, total: recipients.length });
}
