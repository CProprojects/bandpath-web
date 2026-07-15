import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminSessionValue } from "@/lib/adminSession";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSessionValue(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const { plan } = await request.json();

  if (plan !== "free" && plan !== "pro") {
    return NextResponse.json({ error: "Plan must be 'free' or 'pro'." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ plan }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan });
}
