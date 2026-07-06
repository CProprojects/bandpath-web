import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { TESTS } from "@/lib/tests";
import { getPartsForTest } from "@/lib/vocab";
import { VocabSession } from "@/components/VocabSession";

export default async function VocabularyTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (testId === "all") {
    return (
      <AppShell active="/vocabulary">
        <VocabSession title="Today's Practice" />
      </AppShell>
    );
  }

  const test = TESTS.find((t) => t.id === testId);
  if (!test) {
    redirect("/vocabulary");
  }

  const parts = getPartsForTest(testId);

  const { data: progressRows } = await supabase
    .from("vocab_progress")
    .select("word_id, status")
    .eq("user_id", user.id);

  const masteredIds = new Set(
    (progressRows ?? []).filter((r) => r.status === "mastered").map((r) => r.word_id)
  );

  return (
    <AppShell active="/vocabulary">
      <Link href="/vocabulary" className="text-sm font-semibold text-white/40 hover:text-white/70">
        &larr; Vocabulary
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white md:text-3xl">{test!.title}</h1>
      <p className="mt-2 text-white/50">Pick a part to practice — each is a short 6-8 word batch.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {parts.map((part, i) => {
          const mastered = part.filter((w) => masteredIds.has(w.id)).length;
          return (
            <Link
              key={i}
              href={`/vocabulary/${testId}/${i}`}
              className="flex items-center justify-between rounded-2xl border border-bp-border bg-bp-card p-5 transition-colors hover:border-bp-accent/40"
            >
              <div>
                <div className="font-bold text-white">Part {i + 1}</div>
                <div className="mt-1 text-xs text-white/40">{part.length} words</div>
              </div>
              <div className="font-bold text-bp-success">
                {mastered}/{part.length}
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
