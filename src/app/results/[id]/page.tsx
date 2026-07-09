import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Target, Clock } from "lucide-react";
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

      <div className="relative mt-6 flex flex-col items-center overflow-hidden rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/10 to-bp-card/70 p-8">
        <div
          className="pointer-events-none absolute left-1/2 top-6 h-56 w-56 -translate-x-1/2 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(0,196,255,.22), transparent 65%)" }}
        />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-bp-accent text-4xl font-extrabold text-bp-accent shadow-[0_0_36px_-6px_rgba(0,196,255,0.6)]">
          {result.score_band ?? "—"}
        </div>
        <div className="relative mt-2 text-sm text-white/50">Band</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={CheckCircle2} color="bp-success" label="Correct" value={result.score_raw ?? "—"} />
        <Stat icon={Target} color="bp-accent" label="Accuracy" value={accuracy !== null ? `${accuracy}%` : "—"} />
        <Stat
          icon={Clock}
          color="bp-warning"
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

function Stat({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "bp-success" | "bp-accent" | "bp-warning";
  label: string;
  value: string | number;
}) {
  const colorClasses = {
    "bp-success": "border-bp-success/20 from-bp-success/15 text-bp-success",
    "bp-accent": "border-bp-accent/20 from-bp-accent/15 text-bp-accent",
    "bp-warning": "border-bp-warning/20 from-bp-warning/15 text-bp-warning",
  }[color];

  return (
    <div className={`rounded-2xl border bg-gradient-to-br to-bp-card/60 p-4 text-center ${colorClasses}`}>
      <Icon className="mx-auto h-4 w-4" />
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] font-semibold text-white/50">{label}</div>
    </div>
  );
}
