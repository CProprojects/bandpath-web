import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ReadingIcon, ListeningIcon, LockIcon } from "@/components/TestIcons";
import { createClient } from "@/lib/supabase/server";
import { TESTS } from "@/lib/tests";

export default async function TestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  const { data: results } = await supabase
    .from("test_results")
    .select("test_id, score_band")
    .eq("user_id", user.id);

  const bestByTest = new Map<string, number>();
  (results ?? []).forEach((r) => {
    if (r.score_band == null) return;
    const prev = bestByTest.get(r.test_id);
    if (prev === undefined || r.score_band > prev) {
      bestByTest.set(r.test_id, r.score_band);
    }
  });

  const isPro = profile?.plan === "pro";

  return (
    <AppShell active="/tests">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Test Library</h1>
      <p className="mt-2 text-white/50">Practice reading and listening under real exam conditions.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {TESTS.map((test) => {
          const locked = test.requiresPro && !isPro;
          const bestBand = bestByTest.get(test.id);
          const Icon = test.type === "reading" ? ReadingIcon : ListeningIcon;

          const card = (
            <div
              className={`flex items-center gap-4 rounded-2xl border border-bp-border p-4 transition-colors ${
                locked ? "bg-bp-card/50 opacity-60" : "bg-bp-card hover:border-bp-accent/40"
              }`}
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                  test.type === "reading"
                    ? "bg-bp-accent/15 text-bp-accent"
                    : "bg-bp-warning/15 text-bp-warning"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{test.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                  <span>
                    {test.questionCount} questions · {test.durationMinutes} min
                  </span>
                  <span className="rounded-full bg-bp-success/15 px-2 py-0.5 font-semibold text-bp-success">
                    {test.difficulty}
                  </span>
                </div>
              </div>
              {locked ? (
                <LockIcon className="h-5 w-5 flex-shrink-0 text-white/40" />
              ) : bestBand !== undefined ? (
                <div className="flex-shrink-0 font-bold text-bp-success">{bestBand.toFixed(1)}</div>
              ) : (
                <div className="flex-shrink-0 text-white/30">—</div>
              )}
            </div>
          );

          return (
            <Link key={test.id} href={locked ? "/upgrade" : `/tests/${test.id}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
