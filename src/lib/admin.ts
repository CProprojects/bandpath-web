export function isAdminTelegramId(telegramId: string | null | undefined) {
  if (!telegramId) return false;
  const allowed = (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(telegramId);
}
