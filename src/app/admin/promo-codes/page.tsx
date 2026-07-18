import { Tag, TrendingUp, Coins } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { PromoCodesPanel } from "@/components/PromoCodesPanel";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/requireAdmin";

export default async function AdminPromoCodesPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const [{ data: codes }, { data: payments }, { data: clicks }] = await Promise.all([
    admin.from("promo_codes").select("*").order("created_at", { ascending: false }),
    admin.from("payments").select("promo_code_id, stars_amount").eq("status", "paid"),
    admin.from("promo_clicks").select("promo_code_id"),
  ]);

  const paymentsByCode = new Map<string, { conversions: number; revenue: number }>();
  (payments ?? []).forEach((p) => {
    if (!p.promo_code_id) return;
    const prev = paymentsByCode.get(p.promo_code_id) ?? { conversions: 0, revenue: 0 };
    paymentsByCode.set(p.promo_code_id, { conversions: prev.conversions + 1, revenue: prev.revenue + p.stars_amount });
  });

  const clicksByCode = new Map<string, number>();
  (clicks ?? []).forEach((c) => {
    clicksByCode.set(c.promo_code_id, (clicksByCode.get(c.promo_code_id) ?? 0) + 1);
  });

  const items = (codes ?? []).map((c) => {
    const stats = paymentsByCode.get(c.id) ?? { conversions: 0, revenue: 0 };
    return {
      id: c.id,
      code: c.code,
      label: c.label,
      discountPercent: c.discount_percent,
      commissionPercent: c.commission_percent,
      active: c.active,
      conversions: stats.conversions,
      revenueStars: stats.revenue,
      owedStars: Math.round((stats.revenue * c.commission_percent) / 100),
      pendingClicks: clicksByCode.get(c.id) ?? 0,
      createdAt: c.created_at,
    };
  });

  const totalConversions = items.reduce((sum, i) => sum + i.conversions, 0);
  const totalRevenue = items.reduce((sum, i) => sum + i.revenueStars, 0);

  return (
    <AdminShell active="/admin/promo-codes">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Promo Codes</h1>
      <p className="mt-2 text-white/50">Track which blogger or ad link is actually converting into sales.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/15 to-bp-card/60 p-4 text-center">
          <Tag className="mx-auto h-5 w-5 text-bp-accent" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-accent">{items.length}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Codes</div>
        </div>
        <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-bp-success" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">{totalConversions}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Conversions</div>
        </div>
        <div className="rounded-2xl border border-bp-warning/20 bg-gradient-to-br from-bp-warning/15 to-bp-card/60 p-4 text-center">
          <Coins className="mx-auto h-5 w-5 text-bp-warning" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-warning">{totalRevenue}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Total Stars</div>
        </div>
      </div>

      <div className="mt-6">
        <PromoCodesPanel items={items} />
      </div>
    </AdminShell>
  );
}
