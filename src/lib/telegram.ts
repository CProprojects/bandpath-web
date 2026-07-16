import type { SupabaseClient } from "@supabase/supabase-js";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

type InlineButton = { text: string } & ({ callback_data: string } | { url: string });
export type InlineKeyboard = { inline_keyboard: InlineButton[][] };

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: { replyMarkup?: InlineKeyboard; parseMode?: "HTML" },
) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
      ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${await res.text()}`);
  }

  return res.json();
}

export async function sendTelegramPhoto(
  chatId: number | string,
  photoUrl: string,
  caption?: string,
  options?: { replyMarkup?: InlineKeyboard },
) {
  const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      ...(caption ? { caption } : {}),
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram sendPhoto failed: ${await res.text()}`);
  }

  return res.json();
}

// Telegram's sendPhoto-by-URL requires Telegram's own servers to fetch the
// image; Supabase Storage's CDN (Cloudflare) appears to block that fetch
// specifically (confirmed via testing: a plain curl succeeds, but Telegram
// reports "wrong type of the web page content" for the same URL) — likely
// bot-fingerprinting unrelated to the file itself. Downloading the bytes
// ourselves and uploading them directly via multipart sidesteps this
// entirely and is what all Supabase-Storage-hosted photos should use.
export async function sendTelegramPhotoBuffer(
  chatId: number | string,
  photo: Buffer,
  filename: string,
  caption?: string,
  options?: { replyMarkup?: InlineKeyboard },
) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  if (options?.replyMarkup) form.append("reply_markup", JSON.stringify(options.replyMarkup));
  form.append("photo", new Blob([new Uint8Array(photo)]), filename);

  const res = await fetch(`${TELEGRAM_API}/sendPhoto`, { method: "POST", body: form });

  if (!res.ok) {
    throw new Error(`Telegram sendPhoto failed: ${await res.text()}`);
  }

  return res.json();
}

// Downloads a photo previously uploaded to Supabase Storage (by its public
// URL) and forwards it to Telegram via sendTelegramPhotoBuffer, avoiding the
// broken sendPhoto-by-URL path above.
export async function sendTelegramPhotoFromStorage(
  admin: SupabaseClient,
  bucket: string,
  publicUrl: string,
  chatId: number | string,
  caption?: string,
  options?: { replyMarkup?: InlineKeyboard },
) {
  const path = publicUrl.split(`/${bucket}/`)[1];
  if (!path) {
    throw new Error(`Could not extract storage path from URL: ${publicUrl}`);
  }

  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Failed to download from storage: ${error?.message ?? "no data"}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const filename = path.split("/").pop() || "photo.jpg";

  return sendTelegramPhotoBuffer(chatId, buffer, filename, caption, options);
}

export async function copyTelegramMessage(
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  options?: { replyMarkup?: InlineKeyboard },
) {
  const res = await fetch(`${TELEGRAM_API}/copyMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram copyMessage failed: ${await res.text()}`);
  }

  return res.json();
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: { replyMarkup?: InlineKeyboard },
) {
  const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram editMessageText failed: ${await res.text()}`);
  }

  return res.json();
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const res = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  });

  if (!res.ok) {
    throw new Error(`Telegram answerCallbackQuery failed: ${await res.text()}`);
  }

  return res.json();
}

export function generateLoginCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateSessionToken() {
  return crypto.randomUUID().replace(/-/g, "");
}
