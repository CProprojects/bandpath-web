import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /admin is intentionally excluded — it has its own password-based session
// (see requireAdmin()), independent of Telegram/student accounts.
const PROTECTED_PREFIXES = ["/dashboard", "/tests", "/results", "/upgrade", "/vocabulary", "/profile", "/progress"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const isRoot = request.nextUrl.pathname === "/";

  // Temporary: DEMO_MODE=true auto-logs visitors into a fixed demo account
  // instead of sending them to the Telegram login screen, so the bare link
  // opens straight into the app. Toggle DEMO_MODE off to restore normal
  // Telegram-only login — nothing below is deleted, only bypassed.
  if (process.env.DEMO_MODE === "true" && !user && (isProtected || isRoot)) {
    const demoUrl = request.nextUrl.clone();
    demoUrl.pathname = "/api/auth/demo";
    demoUrl.search = "";
    demoUrl.searchParams.set("next", isRoot ? "/dashboard" : request.nextUrl.pathname);
    return NextResponse.redirect(demoUrl);
  }

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
