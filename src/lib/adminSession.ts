import crypto from "crypto";

export const ADMIN_COOKIE = "bp_admin_session";
const SESSION_DAYS = 30;

function secret() {
  return process.env.ADMIN_ACCESS_CODE!;
}

function sign(expiresAt: number) {
  return crypto.createHmac("sha256", secret()).update(String(expiresAt)).digest("hex");
}

export function createAdminSessionValue() {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { value: `${expiresAt}.${sign(expiresAt)}`, maxAgeSeconds: SESSION_DAYS * 24 * 60 * 60 };
}

export function verifyAdminSessionValue(value: string | undefined | null) {
  if (!value) return false;
  const [expiresAtStr, mac] = value.split(".");
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !mac || Date.now() > expiresAt) return false;

  const expected = sign(expiresAt);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyAccessCode(code: string) {
  const expected = secret();
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
