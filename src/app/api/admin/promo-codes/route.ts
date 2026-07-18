import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminSessionValue } from "@/lib/adminSession";

export async function POST(request: NextRequest) {
  if (!verifyAdminSessionValue(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { code, label, discountPercent, commissionPercent } = await request.json();

  const trimmedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  const discount = Number(discountPercent);
  const commission = Number(commissionPercent);

  if (!trimmedCode) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }
  if (!trimmedLabel) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    return NextResponse.json({ error: "Discount % must be between 0 and 100." }, { status: 400 });
  }
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return NextResponse.json({ error: "Commission % must be between 0 and 100." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").insert({
    code: trimmedCode,
    label: trimmedLabel,
    discount_percent: discount,
    commission_percent: commission,
  });

  if (error) {
    return NextResponse.json({ error: error.message.includes("duplicate") ? "That code already exists." : error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
