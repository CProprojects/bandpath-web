import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendTelegramMessage,
  editTelegramMessage,
  answerCallbackQuery,
  generateLoginCode,
  type InlineKeyboard,
} from "@/lib/telegram";
import { getWordById, type VocabWord } from "@/lib/vocab";
import { getVocabSessionWords, recordVocabProgress, buildQuizOptions } from "@/lib/vocabProgress";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from: { id: number; username?: string; first_name?: string };
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: { id: number };
  message?: { chat: { id: number }; message_id: number };
  data?: string;
};

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json();
  const admin = createAdminClient();

  if (update.callback_query) {
    await handleCallbackQuery(admin, update.callback_query);
    return NextResponse.json({ ok: true });
  }

  const message: TelegramMessage | undefined = update.message;
  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const text = message.text.trim();

  if (text.startsWith("/start")) {
    await handleStart(admin, message);
  } else if (text === "/vocab") {
    await handleVocabCommand(admin, message);
  } else {
    await handleSpellingReply(admin, message);
  }

  return NextResponse.json({ ok: true });
}

// ─────────────────────────────────────────────
// Safe Telegram API wrappers — a failed outbound call must never turn the
// webhook response into a non-200 (Telegram retries aggressively on that).
// ─────────────────────────────────────────────
async function safeSend(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboard,
  parseMode?: "HTML",
) {
  try {
    return await sendTelegramMessage(chatId, text, { replyMarkup, parseMode });
  } catch (e) {
    console.error("[telegram] sendMessage failed:", e);
    return null;
  }
}

async function safeEdit(
  chatId: number | string,
  messageId: number | null | undefined,
  text: string,
  replyMarkup: InlineKeyboard = { inline_keyboard: [] },
) {
  if (!messageId) return null;
  try {
    return await editTelegramMessage(chatId, messageId, text, { replyMarkup });
  } catch (e) {
    console.error("[telegram] editMessageText failed:", e);
    return null;
  }
}

async function safeAnswer(callbackQueryId: string, text?: string) {
  try {
    return await answerCallbackQuery(callbackQueryId, text);
  } catch (e) {
    console.error("[telegram] answerCallbackQuery failed:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// /start — existing login-code flow, plus a /vocab mention for users who
// are already linked and open the bot with no session token.
// ─────────────────────────────────────────────
async function handleStart(admin: SupabaseClient, message: TelegramMessage) {
  const startParam = message.text!.trim().split(/\s+/)[1];

  if (startParam === "upgrade") {
    await safeSend(
      message.chat.id,
      "BandPath Pro isn't purchasable yet, but it's coming soon! We'll let you know as soon as it's ready.",
    );
    return;
  }

  const sessionToken = startParam;

  if (!sessionToken) {
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("telegram_id", String(message.from.id))
      .maybeSingle();

    if (existingUser) {
      await safeSend(
        message.chat.id,
        "Welcome back! Send /vocab anytime to practice today's vocabulary words right here in the chat.",
      );
    } else {
      await safeSend(message.chat.id, "Open this bot from the BandPath website's login page to get your code.");
    }
    return;
  }

  const { data: session } = await admin
    .from("telegram_login_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!session) {
    await safeSend(message.chat.id, "This login link has expired. Go back to the BandPath website and try again.");
    return;
  }

  const code = generateLoginCode();

  await admin
    .from("telegram_login_sessions")
    .update({
      telegram_id: String(message.from.id),
      telegram_username: message.from.username ?? null,
      telegram_first_name: message.from.first_name ?? null,
      code,
    })
    .eq("session_token", sessionToken);

  await safeSend(
    message.chat.id,
    `Your BandPath login code is:\n\n<code>${code}</code>\n\nTap the code to copy it, then enter it on the website to finish logging in.`,
    undefined,
    "HTML",
  );
}

// ─────────────────────────────────────────────
// /vocab — starts a fresh Learn → Quiz → Spelling session in chat.
// ─────────────────────────────────────────────
async function handleVocabCommand(admin: SupabaseClient, message: TelegramMessage) {
  const chatId = message.chat.id;
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("telegram_id", String(message.from.id))
    .maybeSingle();

  if (!user) {
    await safeSend(
      chatId,
      "You need to log in first — open the BandPath website, log in with Telegram, then come back and send /vocab.",
    );
    return;
  }

  const { words } = await getVocabSessionWords(admin, user.id, {});

  if (words.length === 0) {
    await safeSend(chatId, "🎉 All caught up! No words due for review right now. Come back tomorrow.");
    return;
  }

  await admin.from("telegram_vocab_sessions").upsert(
    {
      user_id: user.id,
      chat_id: String(chatId),
      word_ids: words.map((w) => w.id),
      stage: "learn",
      index: 0,
      quiz_option_ids: null,
      card_message_id: null,
      session_xp: 0,
      session_mastered: 0,
      session_correct_spelling: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  const sent = await safeSend(chatId, learnCardText(words[0], 0, words.length), learnKeyboard());
  const messageId = sent?.result?.message_id;
  if (messageId) {
    await admin.from("telegram_vocab_sessions").update({ card_message_id: messageId }).eq("user_id", user.id);
  }
}

// ─────────────────────────────────────────────
// Inline button taps — Learn "Next Word" and Quiz answer options.
// ─────────────────────────────────────────────
async function handleCallbackQuery(admin: SupabaseClient, cq: TelegramCallbackQuery) {
  const chatId = cq.message?.chat?.id;
  const data = cq.data ?? "";

  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("telegram_id", String(cq.from.id))
    .maybeSingle();

  if (!user) {
    await safeAnswer(cq.id, "Please log in first.");
    return;
  }

  const { data: session } = await admin
    .from("telegram_vocab_sessions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session || !chatId) {
    await safeAnswer(cq.id, "Session expired — send /vocab to start again.");
    return;
  }

  const words = (session.word_ids as string[])
    .map((id) => getWordById(id))
    .filter((w): w is VocabWord => !!w);

  const currentWord = words[session.index];
  if (!currentWord) {
    await safeAnswer(cq.id, "Session expired — send /vocab to start again.");
    return;
  }

  if (data === "learn_next") {
    if (session.stage !== "learn") {
      await safeAnswer(cq.id, "This session has moved on.");
      return;
    }

    await recordVocabProgress(admin, user.id, { wordId: currentWord.id, stage: "learn" });
    await safeAnswer(cq.id);

    const nextIndex = session.index + 1;
    if (nextIndex < words.length) {
      await admin
        .from("telegram_vocab_sessions")
        .update({ index: nextIndex, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await safeEdit(chatId, session.card_message_id, learnCardText(words[nextIndex], nextIndex, words.length), learnKeyboard());
    } else {
      const options = buildQuizOptions(words, words[0]);
      await admin
        .from("telegram_vocab_sessions")
        .update({
          stage: "quiz",
          index: 0,
          quiz_option_ids: options.map((o) => o.id),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      await safeEdit(chatId, session.card_message_id, quizCardText(words[0], 0, words.length), quizKeyboard(options));
    }
    return;
  }

  if (data.startsWith("quiz:")) {
    if (session.stage !== "quiz") {
      await safeAnswer(cq.id, "This session has moved on.");
      return;
    }

    const optIdx = Number(data.split(":")[1]);
    const optionIds: string[] = session.quiz_option_ids ?? [];
    const chosenId = optionIds[optIdx];
    const correct = chosenId === currentWord.id;

    await recordVocabProgress(admin, user.id, { wordId: currentWord.id, stage: "quiz", correct });
    await safeAnswer(cq.id, correct ? "✅ Correct!" : `❌ It was: ${truncate(currentWord.meaning, 180)}`);

    const nextIndex = session.index + 1;
    if (nextIndex < words.length) {
      const options = buildQuizOptions(words, words[nextIndex]);
      await admin
        .from("telegram_vocab_sessions")
        .update({
          index: nextIndex,
          quiz_option_ids: options.map((o) => o.id),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      await safeEdit(chatId, session.card_message_id, quizCardText(words[nextIndex], nextIndex, words.length), quizKeyboard(options));
    } else {
      await admin
        .from("telegram_vocab_sessions")
        .update({ stage: "spelling", index: 0, quiz_option_ids: null, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await safeEdit(chatId, session.card_message_id, spellingCardText(words[0], 0, words.length));
    }
    return;
  }

  await safeAnswer(cq.id);
}

// ─────────────────────────────────────────────
// Plain text replies during the Spelling stage.
// ─────────────────────────────────────────────
async function handleSpellingReply(admin: SupabaseClient, message: TelegramMessage) {
  const chatId = message.chat.id;
  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("telegram_id", String(message.from.id))
    .maybeSingle();

  if (!user) return;

  const { data: session } = await admin
    .from("telegram_vocab_sessions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session || session.stage !== "spelling") return;

  const words = (session.word_ids as string[])
    .map((id) => getWordById(id))
    .filter((w): w is VocabWord => !!w);

  const currentWord = words[session.index];
  if (!currentWord) return;

  const correct = message.text!.trim().toLowerCase() === currentWord.word.toLowerCase();
  const result = await recordVocabProgress(admin, user.id, { wordId: currentWord.id, stage: "spelling", correct });
  const xpAwarded = "xpAwarded" in result ? result.xpAwarded : 0;
  const mastered = "status" in result && result.status === "mastered";
  const streakCount = "streakCount" in result ? result.streakCount : undefined;

  await safeSend(
    chatId,
    correct ? `✅ Correct! +${xpAwarded} XP` : `❌ Not quite — correct spelling: ${currentWord.word}`,
  );

  const nextIndex = session.index + 1;
  const newXp = session.session_xp + xpAwarded;
  const newMastered = session.session_mastered + (mastered ? 1 : 0);
  const newCorrectSpelling = session.session_correct_spelling + (correct ? 1 : 0);

  if (nextIndex < words.length) {
    await admin
      .from("telegram_vocab_sessions")
      .update({
        index: nextIndex,
        session_xp: newXp,
        session_mastered: newMastered,
        session_correct_spelling: newCorrectSpelling,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    await safeEdit(chatId, session.card_message_id, spellingCardText(words[nextIndex], nextIndex, words.length));
  } else {
    const accuracy = words.length ? Math.round((newCorrectSpelling / words.length) * 100) : 0;
    await safeSend(
      chatId,
      summaryText({ xp: newXp, total: words.length, mastered: newMastered, streak: streakCount, accuracy }),
    );
    await admin.from("telegram_vocab_sessions").delete().eq("user_id", user.id);
  }
}

// ─────────────────────────────────────────────
// Message + keyboard formatting
// ─────────────────────────────────────────────
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function learnCardText(word: VocabWord, index: number, total: number) {
  return `📘 LEARN — Word ${index + 1}/${total}\n\n${word.word}\n\n${word.meaning}\n\n🇺🇿 ${word.uz}\n🇷🇺 ${word.ru}`;
}

function learnKeyboard(): InlineKeyboard {
  return { inline_keyboard: [[{ text: "Next Word ▶️", callback_data: "learn_next" }]] };
}

function quizCardText(word: VocabWord, index: number, total: number) {
  return `🧠 QUIZ — Word ${index + 1}/${total}\n\nWhat does "${word.word}" mean?`;
}

function quizKeyboard(options: VocabWord[]): InlineKeyboard {
  return { inline_keyboard: options.map((o, i) => [{ text: truncate(o.meaning, 60), callback_data: `quiz:${i}` }]) };
}

function spellingCardText(word: VocabWord, index: number, total: number) {
  return `✍️ SPELLING — Word ${index + 1}/${total}\n\nType the English word for:\n${word.meaning}\n\n🇺🇿 ${word.uz}   🇷🇺 ${word.ru}`;
}

function summaryText({
  xp,
  total,
  mastered,
  streak,
  accuracy,
}: {
  xp: number;
  total: number;
  mastered: number;
  streak?: number;
  accuracy: number;
}) {
  return `🎉 Session Complete!\n\n+${xp} XP earned\n📚 ${total} words practiced\n⭐ ${mastered} mastered\n🔥 ${
    streak ?? "—"
  } day streak\n✅ ${accuracy}% spelling accuracy\n\nSend /vocab anytime to practice more.`;
}
