import { AdminShell } from "@/components/AdminShell";
import { BroadcastForm } from "@/components/BroadcastForm";
import { requireAdmin } from "@/lib/requireAdmin";

export default async function BroadcastPage() {
  await requireAdmin();

  return (
    <AdminShell active="/admin/broadcast">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Broadcast</h1>
      <p className="mt-2 text-white/50">
        Send a message to every user who has started your Telegram bot.
      </p>
      <div className="mt-6 max-w-xl">
        <BroadcastForm />
      </div>
    </AdminShell>
  );
}
