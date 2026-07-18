import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendTelegramMessage,
  copyTelegramMessage,
  editTelegramMessage,
  answerCallbackQuery,
  sendTelegramInvoice,
  answerPreCheckoutQuery,
  generateLoginCode,
  generateSessionToken,
  type InlineKeyboard,
} from "@/lib/telegram";
import { getWordById, type VocabWord } from "@/lib/vocab";
import { getVocabSessionWords, recordVocabProgress, buildQuizOptions } from "@/lib/vocabProgress";
import { resolveFeedbackTelegramId, formatContactSender } from "@/lib/feedback";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from: { id: number; username?: string; first_name?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number; height: number }[];
  successful_payment?: { telegram_payment_charge_id: string; invoice_payload: string; total_amount: number };
};

type TelegramPreCheckoutQuery = {
  id: string;
  from: { id: number };
};

type TelegramCallbackQuery = {
  id: string;
  from: { id: number; username?: string; first_name?: string };
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

  if (update.pre_checkout_query) {
    await handlePreCheckout(update.pre_checkout_query);
    return NextResponse.json({ ok: true });
  }

  const message: TelegramMessage | undefined = update.message;
  if (!message || (!message.text && !message.photo && !message.successful_payment)) {
    return NextResponse.json({ ok: true });
  }

  if (message.successful_payment) {
    await handleSuccessfulPayment(admin, message);
    return NextResponse.json({ ok: true });
  }

  const text = message.text?.trim() ?? "";

  if (text.startsWith("/start")) {
    await clearPendingContact(admin, message.chat.id);
    await handleStart(admin, message);
  } else if (text === "/vocab") {
    await clearPendingContact(admin, message.chat.id);
    await handleVocabCommand(admin, message);
  } else {
    await handleTextReply(admin, message);
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

async function clearPendingContact(admin: SupabaseClient, chatId: number) {
  await admin.from("telegram_feedback_pending").delete().eq("chat_id", String(chatId));
}

// ─────────────────────────────────────────────
// /start — existing login-code flow, plus a /vocab mention for users who
// are already linked and open the bot with no session token.
// ─────────────────────────────────────────────
async function handleStart(admin: SupabaseClient, message: TelegramMessage) {
  const startParam = message.text!.trim().split(/\s+/)[1];

  if (startParam?.startsWith("promo_")) {
    await handlePromoClick(admin, message, startParam.slice("promo_".length));
    return;
  }

  if (startParam === "upgrade") {
    await handleUpgrade(admin, message);
    return;
  }

  const sessionToken = startParam;

  if (!sessionToken) {
    await safeSend(message.chat.id, WELCOME_TEXT, mainMenuKeyboard());
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
// /start promo_XYZ — a blogger/ad deep link. Records last-click attribution
// (overwrites any earlier code for this chat) so /start upgrade later on
// picks up the discount, even if the user doesn't buy right away.
// ─────────────────────────────────────────────
async function handlePromoClick(admin: SupabaseClient, message: TelegramMessage, rawCode: string) {
  const code = rawCode.toUpperCase();
  const { data: promo } = await admin.from("promo_codes").select("*").eq("code", code).eq("active", true).maybeSingle();

  if (!promo) {
    await safeSend(message.chat.id, WELCOME_TEXT, mainMenuKeyboard());
    return;
  }

  await admin.from("promo_clicks").upsert({
    telegram_id: String(message.from.id),
    promo_code_id: promo.id,
    clicked_at: new Date().toISOString(),
  });

  await safeSend(
    message.chat.id,
    `🎉 Code "${promo.code}" applied — you'll get ${promo.discount_percent}% off Pro!\n\n${WELCOME_TEXT}`,
    mainMenuKeyboard(),
  );
}

// ─────────────────────────────────────────────
// /start upgrade — sends a Telegram Stars invoice for BandPath Pro (30
// days). Requires an already-linked account (users.plan lives there).
// Applies any pending promo-code discount from handlePromoClick above.
// ─────────────────────────────────────────────
async function handleUpgrade(admin: SupabaseClient, message: TelegramMessage) {
  const chatId = message.chat.id;
  const telegramId = String(message.from.id);

  const { data: user } = await admin.from("users").select("id").eq("telegram_id", telegramId).maybeSingle();
  if (!user) {
    await safeSend(chatId, "Log in to BandPath first (tap 🌐 Go to Platform), then send /start upgrade again.");
    return;
  }

  const { data: click } = await admin
    .from("promo_clicks")
    .select("*, promo_codes(*)")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  const promo = click?.promo_codes && click.promo_codes.active ? click.promo_codes : null;

  const basePrice = Number(process.env.PRO_PRICE_STARS ?? "1");
  const amountStars = Math.max(1, Math.round(basePrice * (1 - (promo?.discount_percent ?? 0) / 100)));

  try {
    await sendTelegramInvoice(chatId, {
      title: "BandPath Pro — 30 days",
      description: promo
        ? `Full access to all tests and features for 30 days. Includes ${promo.discount_percent}% off with code ${promo.code}.`
        : "Full access to all tests and features for 30 days.",
      payload: promo?.id ?? "none",
      amountStars,
    });
  } catch (e) {
    console.error("[telegram] sendInvoice failed:", e);
    await safeSend(chatId, "Something went wrong sending the payment invoice — please try again.");
  }
}

// ─────────────────────────────────────────────
// pre_checkout_query — must be answered within 10 seconds or the payment is
// cancelled. Price was already computed server-side in handleUpgrade, so
// there's nothing left to validate; always approve.
// ─────────────────────────────────────────────
async function handlePreCheckout(query: TelegramPreCheckoutQuery) {
  try {
    await answerPreCheckoutQuery(query.id, true);
  } catch (e) {
    console.error("[telegram] answerPreCheckoutQuery failed:", e);
  }
}

// ─────────────────────────────────────────────
// successful_payment — the source of truth for granting Pro access. Records
// the transaction (for admin promo-code stats) and flips users.plan.
// ─────────────────────────────────────────────
async function handleSuccessfulPayment(admin: SupabaseClient, message: TelegramMessage) {
  const payment = message.successful_payment!;
  const telegramId = String(message.from.id);
  const promoCodeId = payment.invoice_payload !== "none" ? payment.invoice_payload : null;

  const { data: user } = await admin.from("users").select("id").eq("telegram_id", telegramId).maybeSingle();

  await admin.from("payments").insert({
    user_id: user?.id ?? null,
    telegram_id: telegramId,
    promo_code_id: promoCodeId,
    stars_amount: payment.total_amount,
    telegram_charge_id: payment.telegram_payment_charge_id,
  });

  if (user) {
    await admin.from("users").update({ plan: "pro" }).eq("id", user.id);
  }

  await safeSend(message.chat.id, "✅ Payment received — you now have BandPath Pro for 30 days!");
}

// ─────────────────────────────────────────────
// "Go to Platform" main-menu button — same login-code flow as /start with a
// token, but self-initiated from inside the bot instead of started by the
// website. Generates its own session token, so there's no website step
// first: we send a code plus a direct link to a bare "enter your code" page.
// ─────────────────────────────────────────────
async function handleGoPlatform(admin: SupabaseClient, cq: TelegramCallbackQuery) {
  const chatId = cq.message?.chat?.id;
  if (!chatId) {
    await safeAnswer(cq.id);
    return;
  }

  const sessionToken = generateSessionToken();
  const code = generateLoginCode();

  const { error } = await admin.from("telegram_login_sessions").insert({
    session_token: sessionToken,
    telegram_id: String(cq.from.id),
    telegram_username: cq.from.username ?? null,
    telegram_first_name: cq.from.first_name ?? null,
    code,
  });

  if (error) {
    await safeAnswer(cq.id, "Something went wrong — please try again.");
    return;
  }

  await safeAnswer(cq.id);

  const siteUrl = process.env.SITE_URL ?? "https://bandpath-web.vercel.app";
  const enterCodeUrl = `${siteUrl}/enter-code?token=${sessionToken}`;

  await safeSend(
    chatId,
    `Your BandPath login code is:\n\n<code>${code}</code>\n\nTap the code to copy it, then tap the button below to open BandPath and paste it in.`,
    { inline_keyboard: [[{ text: "🌐 Open BandPath", url: enterCodeUrl }]] },
    "HTML",
  );
}

// ─────────────────────────────────────────────
// "Contact Us" main-menu button — asks the user to pick a category first,
// then (in handleContactType) marks the chat as "awaiting contact content"
// so the next message (text, photo, or both) is relayed to the site owner
// instead of falling through to the vocab spelling-reply handler. Works for
// anyone, logged in or not (see handleCallbackQuery below).
// ─────────────────────────────────────────────
async function handleStartContact(admin: SupabaseClient, cq: TelegramCallbackQuery) {
  const chatId = cq.message?.chat?.id;
  if (!chatId) {
    await safeAnswer(cq.id);
    return;
  }

  await safeAnswer(cq.id);
  await safeSend(chatId, "📩 What's this about?", {
    inline_keyboard: [
      [{ text: "🐛 Report a Problem", callback_data: "contact_type:report" }],
      [{ text: "💬 Feedback", callback_data: "contact_type:feedback" }],
    ],
  });
}

async function handleContactType(admin: SupabaseClient, cq: TelegramCallbackQuery, type: "report" | "feedback") {
  const chatId = cq.message?.chat?.id;
  if (!chatId) {
    await safeAnswer(cq.id);
    return;
  }

  await admin.from("telegram_feedback_pending").upsert({
    chat_id: String(chatId),
    telegram_id: String(cq.from.id),
    telegram_username: cq.from.username ?? null,
    telegram_first_name: cq.from.first_name ?? null,
    type,
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  await safeAnswer(cq.id);
  const label = type === "report" ? "the problem" : "your feedback";
  await safeSend(chatId, `✍️ Please describe ${label} — you can send text, a photo, or both.`);
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

  // Main-menu buttons work for anyone, logged in or not — handle before the
  // "must have a linked account" gate below (that gate is for vocab-session
  // callbacks only).
  if (data === "go_platform") {
    await handleGoPlatform(admin, cq);
    return;
  }
  if (data === "start_contact") {
    await handleStartContact(admin, cq);
    return;
  }
  if (data.startsWith("contact_type:")) {
    const type = data.split(":")[1] === "report" ? "report" : "feedback";
    await handleContactType(admin, cq, type);
    return;
  }
  if (data === "about_bandpath") {
    await safeAnswer(cq.id);
    if (chatId) await safeSend(chatId, ABOUT_TEXT);
    return;
  }
  if (data.startsWith("reply:")) {
    await handleReplyButton(admin, cq, data.slice("reply:".length));
    return;
  }

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
// Plain text / photo messages — routes to whichever stateful, single-shot
// flow (if any) this chat is currently in. Composing a Contact Us message is
// checked first since it's the simpler, chat_id-scoped flow that works even
// for unregistered users; it falls through to the vocab spelling-reply
// handler otherwise (which is text-only, so photos with no active contact
// flow are simply ignored).
// ─────────────────────────────────────────────
async function handleTextReply(admin: SupabaseClient, message: TelegramMessage) {
  const handledAsAdminReply = await handleAdminReplyCapture(admin, message);
  if (handledAsAdminReply) return;

  const handledAsContact = await handleContactReply(admin, message);
  if (handledAsContact) return;

  if (!message.text) return;
  await handleSpellingReply(admin, message);
}

// ─────────────────────────────────────────────
// Captures the admin's reply (text and/or photo) once their chat is in the
// "awaiting reply" state (see handleReplyButton), and relays it to the
// original submitter's Telegram chat via copyMessage — same full-fidelity,
// no-re-hosting relay used for the reverse direction, preceded by a header
// message so the recipient knows it's an official reply and not spam. Only
// ever matches the admin's own chat_id, since that's the only chat
// handleReplyButton ever writes a pending row for. Returns whether the
// message was consumed.
// ─────────────────────────────────────────────
async function handleAdminReplyCapture(admin: SupabaseClient, message: TelegramMessage): Promise<boolean> {
  const chatId = message.chat.id;

  const { data: pending } = await admin
    .from("admin_reply_pending")
    .select("*")
    .eq("chat_id", String(chatId))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!pending) return false;

  await admin.from("admin_reply_pending").delete().eq("chat_id", String(chatId));

  const replyText = (message.text ?? message.caption ?? "").trim();
  if (!replyText && !message.photo) {
    await safeSend(chatId, "That looked empty — tap ↩️ Reply again to try once more.");
    return true;
  }

  try {
    await sendTelegramMessage(pending.target_telegram_id, "💬 Reply from the BandPath team:");
    await copyTelegramMessage(pending.target_telegram_id, chatId, message.message_id);
    await admin
      .from("feedback")
      .update({
        reply_message: replyText || "[Photo attached]",
        replied_at: new Date().toISOString(),
      })
      .eq("id", pending.feedback_id);
    await safeSend(chatId, "✅ Reply sent.");
  } catch (e) {
    console.error("[telegram] admin reply send failed:", e);
    await safeSend(chatId, "⚠️ Couldn't deliver that reply — the user may have blocked the bot.");
  }

  return true;
}

// ─────────────────────────────────────────────
// "↩️ Reply" button on a forwarded feedback/report — only the admin's own
// chat ever receives this button (it's only ever attached to messages sent
// to ADMIN_TELEGRAM_CHAT_ID), but we double-check here too in case that env
// var changes later or the message gets forwarded elsewhere.
// ─────────────────────────────────────────────
async function handleReplyButton(admin: SupabaseClient, cq: TelegramCallbackQuery, feedbackId: string) {
  const chatId = cq.message?.chat?.id;
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

  if (!chatId || !adminChatId || String(chatId) !== String(adminChatId)) {
    await safeAnswer(cq.id);
    return;
  }

  const { data: feedback } = await admin.from("feedback").select("*").eq("id", feedbackId).maybeSingle();
  if (!feedback) {
    await safeAnswer(cq.id, "This feedback no longer exists.");
    return;
  }

  const targetTelegramId = await resolveFeedbackTelegramId(admin, feedback);
  if (!targetTelegramId) {
    await safeAnswer(cq.id, "Can't reply — no linked Telegram account for this submission.");
    return;
  }

  await admin.from("admin_reply_pending").upsert({
    chat_id: String(chatId),
    feedback_id: feedbackId,
    target_telegram_id: targetTelegramId,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  await safeAnswer(cq.id);
  await safeSend(chatId, "✍️ Type your reply and send it:");
}

// ─────────────────────────────────────────────
// Captures the content (text and/or photo) once a chat is in the "awaiting
// contact content" state (see handleContactType), relays it to the admin's
// personal Telegram chat via copyMessage (preserves photos at full quality,
// no re-hosting needed), and stores a record in the feedback table. Returns
// whether the message was consumed as contact content (so the caller knows
// not to also treat it as a spelling-session reply).
// ─────────────────────────────────────────────
async function handleContactReply(admin: SupabaseClient, message: TelegramMessage): Promise<boolean> {
  const chatId = message.chat.id;

  const { data: pending } = await admin
    .from("telegram_feedback_pending")
    .select("*")
    .eq("chat_id", String(chatId))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!pending) return false;

  await admin.from("telegram_feedback_pending").delete().eq("chat_id", String(chatId));

  const contentText = (message.text ?? message.caption ?? "").trim();
  if (!contentText && !message.photo) {
    await safeSend(chatId, "That looked empty — tap the menu and choose 📩 Contact Us to try again.");
    return true;
  }

  const { data: user } = await admin
    .from("users")
    .select("id, name, full_name")
    .eq("telegram_id", String(message.from.id))
    .maybeSingle();

  const { data: inserted } = await admin
    .from("feedback")
    .insert({
      source: "telegram",
      type: pending.type,
      user_id: user?.id ?? null,
      telegram_id: String(message.from.id),
      telegram_username: message.from.username ?? null,
      message: contentText || (message.photo ? "[Photo attached]" : ""),
    })
    .select()
    .single();

  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (adminChatId) {
    const who = formatContactSender({
      name: user?.name || user?.full_name,
      username: message.from.username,
      telegramId: String(message.from.id),
    });
    const label = pending.type === "report" ? "🐛 Problem Report" : "💬 Feedback";
    const replyKeyboard: InlineKeyboard | undefined = inserted
      ? { inline_keyboard: [[{ text: "↩️ Reply", callback_data: `reply:${inserted.id}` }]] }
      : undefined;
    try {
      await safeSend(adminChatId, `${label} (Telegram) from ${who}:`);
      await copyTelegramMessage(adminChatId, chatId, message.message_id, { replyMarkup: replyKeyboard });
    } catch (e) {
      console.error("[telegram] contact forward failed:", e);
    }
  }

  await safeSend(chatId, "✅ Thanks! Your message has been sent.");
  return true;
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

const WELCOME_TEXT =
  "👋 Welcome to BandPath!\n\n" +
  "Your smartest path to IELTS Band 7+ — real exam-format Reading, Listening, and Writing tests, " +
  "spaced-repetition vocabulary, and band score tracking, all in one place.\n\n" +
  "Use the buttons below to get started 👇";

const ABOUT_TEXT = "ℹ️ About BandPath\n\nInformation about us.";

function mainMenuKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: "📢 Go to Channel", url: "https://t.me/BandPath" }],
      [{ text: "🌐 Go to Platform", callback_data: "go_platform" }],
      [{ text: "📩 Contact Us", callback_data: "start_contact" }],
      [{ text: "ℹ️ About BandPath", callback_data: "about_bandpath" }],
    ],
  };
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
