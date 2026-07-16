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
