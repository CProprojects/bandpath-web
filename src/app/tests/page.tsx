import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TestsGrid, type TestCardData } from "@/components/TestsGrid";
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

  const tests: TestCardData[] = TESTS.map((test) => ({
    id: test.id,
    title: test.title,
    type: test.type,
    questionCount: test.questionCount,
    durationMinutes: test.durationMinutes,
    difficulty: test.difficulty,
    locked: test.requiresPro && !isPro,
    bestBand: bestByTest.get(test.id),
  }));

  return (
    <AppShell active="/tests">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Test Library</h1>
      <p className="mt-2 text-white/50">Practice reading and listening under real exam conditions.</p>
      <TestsGrid tests={tests} />
    </AppShell>
  );
}
