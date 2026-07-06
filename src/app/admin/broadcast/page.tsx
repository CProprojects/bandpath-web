import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BroadcastForm } from "@/components/BroadcastForm";
import { createClient } from "@/lib/supabase/server";
import { isAdminTelegramId } from "@/lib/admin";

export default async function BroadcastPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("telegram_id")
    .eq("id", user.id)
    .single();

  if (!isAdminTelegramId(profile?.telegram_id)) {
    redirect("/dashboard");
  }

  return (
    <AppShell active="/admin/broadcast">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Broadcast</h1>
      <p className="mt-2 text-white/50">
        Send a message to every user who has started your Telegram bot.
      </p>
      <div className="mt-6 max-w-xl">
        <BroadcastForm />
      </div>
    </AppShell>
  );
}
