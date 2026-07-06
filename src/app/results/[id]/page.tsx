import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTestById } from "@/lib/tests";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: result } = await supabase
    .from("test_results")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!result) {
    notFound();
  }

  const test = getTestById(result.test_id);
  const accuracy =
    result.score_raw != null ? Math.round((result.score_raw / 40) * 100) : null;

  return (
    <AppShell active="/tests">
      <h1 className="text-2xl font-bold text-white md:text-3xl">
        {test?.title ?? result.test_id}
      </h1>
      <p className="mt-1 text-sm text-white/40">
        Completed {new Date(result.completed_at).toLocaleString()}
      </p>

      <div className="mt-6 flex flex-col items-center rounded-2xl border border-bp-border bg-bp-card p-8">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-bp-accent text-4xl font-extrabold text-bp-accent">
          {result.score_band ?? "—"}
        </div>
        <div className="mt-2 text-sm text-white/50">Band</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Correct" value={result.score_raw ?? "—"} />
        <Stat label="Accuracy" value={accuracy !== null ? `${accuracy}%` : "—"} />
        <Stat
          label="Time"
          value={
            result.time_spent_seconds
              ? `${Math.round(result.time_spent_seconds / 60)} min`
              : "—"
          }
        />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-bp-border bg-bp-card p-4 text-center">
      <div className="text-2xl font-bold text-bp-accent">{value}</div>
      <div className="mt-1 text-xs text-white/40">{label}</div>
    </div>
  );
}
