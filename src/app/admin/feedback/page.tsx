import { MessageSquare, Bug } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { FeedbackInbox } from "@/components/FeedbackInbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/requireAdmin";

export default async function AdminFeedbackPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("feedback")
    .select("id, source, type, user_id, telegram_id, telegram_username, message, photo_url, reply_message, replied_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const feedback = rows ?? [];

  const userIds = [...new Set(feedback.map((f) => f.user_id).filter((id): id is string => !!id))];
  const { data: users } = userIds.length
    ? await admin.from("users").select("id, name, full_name, telegram_id").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const items = feedback.map((f) => {
    const linkedUser = f.user_id ? userMap.get(f.user_id) : undefined;
    const displayName =
      linkedUser?.name || linkedUser?.full_name || (f.telegram_username ? `@${f.telegram_username}` : null);
    return {
      id: f.id,
      source: f.source as "telegram" | "platform",
      type: f.type as "feedback" | "report",
      displayName,
      telegramId: f.telegram_id ?? linkedUser?.telegram_id ?? null,
      message: f.message,
      photoUrl: f.photo_url,
      replyMessage: f.reply_message,
      repliedAt: f.replied_at,
      createdAt: f.created_at,
    };
  });

  const reportCount = items.filter((i) => i.type === "report").length;
  const feedbackCount = items.length - reportCount;

  return (
    <AdminShell active="/admin/feedback">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Feedback</h1>
      <p className="mt-2 text-white/50">Contact Us submissions from the bot and the website.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/15 to-bp-card/60 p-4 text-center">
          <MessageSquare className="mx-auto h-5 w-5 text-bp-accent" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-accent">{items.length}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Total</div>
        </div>
        <div className="rounded-2xl border border-bp-danger/20 bg-gradient-to-br from-bp-danger/15 to-bp-card/60 p-4 text-center">
          <Bug className="mx-auto h-5 w-5 text-bp-danger" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-danger">{reportCount}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Problem Reports</div>
        </div>
        <div className="rounded-2xl border border-bp-success/20 bg-gradient-to-br from-bp-success/15 to-bp-card/60 p-4 text-center">
          <MessageSquare className="mx-auto h-5 w-5 text-bp-success" />
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-bp-success">{feedbackCount}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/50">Feedback</div>
        </div>
      </div>

      <div className="mt-6">
        <FeedbackInbox items={items} />
      </div>
    </AdminShell>
  );
}
