import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSessionValue, verifyAccessCode } from "@/lib/adminSession";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code || typeof code !== "string" || !verifyAccessCode(code)) {
    // Small delay to slow down naive brute-forcing of the access code.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const { value, maxAgeSeconds } = createAdminSessionValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}
