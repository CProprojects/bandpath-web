import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
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
        <div className="mx-auto w-full max-w-md">
          <VocabSession testTitle="Today's Practice" />
        </div>
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
  const startedIds = new Set((progressRows ?? []).map((r) => r.word_id));

  const totalWords = parts.reduce((sum, p) => sum + p.length, 0);
  const totalMastered = parts.reduce(
    (sum, p) => sum + p.filter((w) => masteredIds.has(w.id)).length,
    0
  );
  const overallPct = totalWords ? Math.round((totalMastered / totalWords) * 100) : 0;

  const partStats = parts.map((part) => {
    const mastered = part.filter((w) => masteredIds.has(w.id)).length;
    const started = part.filter((w) => startedIds.has(w.id)).length;
    return { size: part.length, mastered, started };
  });
  const firstIncompleteIdx = partStats.findIndex((p) => p.mastered < p.size);

  return (
    <AppShell active="/vocabulary">
      <div className="flex items-center gap-2.5">
        <Link
          href="/vocabulary"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-white/70 transition-colors hover:bg-white/[0.12]"
        >
          <ArrowLeft className="h-[15px] w-[15px]" />
        </Link>
        <h1 className="truncate text-lg font-extrabold tracking-tight text-white">
          {test!.title}
        </h1>
      </div>
      <p className="mt-1 pl-[42px] text-[11.5px] font-medium text-white/45">
        {totalWords} words · {totalMastered} mastered
      </p>

      <div className="mt-4 rounded-2xl border border-bp-success/15 bg-bp-card/60 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-white/65">Overall progress</span>
          <span className="text-[11.5px] font-bold text-bp-success">{overallPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-bp-success to-[#00c8a0]"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {parts.map((part, i) => {
          const { size, mastered } = partStats[i];
          const completed = mastered === size;
          const isActive = i === firstIncompleteIdx;
          const pct = size ? Math.round((mastered / size) * 100) : 0;

          return (
            <Link
              key={i}
              href={`/vocabulary/${testId}/${i}`}
              className={`relative rounded-2xl border p-3.5 transition-colors ${
                completed
                  ? "border-bp-success/30 bg-bp-card/60"
                  : isActive
                    ? "border-bp-accent/35 bg-gradient-to-br from-bp-accent/10 to-bp-card/70 shadow-[0_10px_28px_-12px_rgba(0,196,255,0.45)]"
                    : mastered > 0
                      ? "border-bp-warning/20 bg-bp-card/60"
                      : "border-white/[0.06] bg-bp-card/35"
              }`}
            >
              {completed && (
                <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-bp-success shadow-[0_0_10px_rgba(46,213,115,0.65)]">
                  <Check className="h-[11px] w-[11px] stroke-[3.5] text-[#06243c]" />
                </div>
              )}
              {isActive && !completed && (
                <span className="absolute right-2.5 top-2.5 rounded-full border border-bp-accent/30 bg-bp-accent/15 px-1.5 py-0.5 text-[8.5px] font-bold text-[#5fdcff]">
                  Active
                </span>
              )}
              <div className="text-[9px] font-bold tracking-wide text-white/45">PART</div>
              <div className="text-[28px] font-extrabold leading-tight tracking-tight text-white">
                {i + 1}
              </div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full ${
                    completed ? "bg-bp-success" : isActive ? "bg-bp-accent" : "bg-bp-warning"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 text-[9.5px] font-semibold text-white/45">
                {mastered} / {size}
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
