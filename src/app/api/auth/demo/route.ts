import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Temporary bypass: when DEMO_MODE=true, visitors are auto-logged into a
// fixed demo account instead of being sent to the Telegram login screen.
// Toggle DEMO_MODE off to go back to requiring real Telegram login — no
// login code is touched or removed by this route.
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";

  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: process.env.DEMO_ACCOUNT_EMAIL!,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=demo-failed", request.url));
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.redirect(new URL("/login?error=demo-failed", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
