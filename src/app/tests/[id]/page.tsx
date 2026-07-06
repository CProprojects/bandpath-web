import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTestById } from "@/lib/tests";
import { getWordsForTest } from "@/lib/vocab";
import { ReadingIcon, ListeningIcon } from "@/components/TestIcons";

export default async function TestLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = getTestById(id);

  if (!test) {
    redirect("/tests");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (test.requiresPro) {
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profile?.plan !== "pro") {
      redirect("/upgrade");
    }
  }

  const vocabWords = getWordsForTest(test.id);
  const hasVocab = vocabWords.length > 0;
  const Icon = test.type === "reading" ? ReadingIcon : ListeningIcon;

  return (
    <AppShell active="/tests">
      <Link href="/tests" className="text-sm font-semibold text-white/40 hover:text-white/70">
        &larr; Back to Test Library
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${
            test.type === "reading" ? "bg-bp-accent/15 text-bp-accent" : "bg-bp-warning/15 text-bp-warning"
          }`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{test.title}</h1>
          <p className="mt-1 text-sm text-white/40">
            {test.questionCount} questions · {test.durationMinutes} min · {test.difficulty}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/tests/${test.id}/take`}
          className="flex flex-col gap-2 rounded-2xl border border-bp-border bg-bp-card p-6 transition-colors hover:border-bp-accent/50"
        >
          <span className="text-lg font-bold text-white">Start Test</span>
          <span className="text-sm text-white/50">
            Take the full {test.type} test under real exam conditions.
          </span>
        </Link>

        {hasVocab ? (
          <Link
            href={`/vocabulary/${test.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-bp-border bg-bp-card p-6 transition-colors hover:border-bp-success/50"
          >
            <span className="text-lg font-bold text-white">Practice Vocabulary</span>
            <span className="text-sm text-white/50">
              Learn the {vocabWords.length} key words from this test — earn XP and build your streak.
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-bp-border bg-bp-card/50 p-6 opacity-60">
            <span className="text-lg font-bold text-white">Practice Vocabulary</span>
            <span className="text-sm text-white/50">Coming soon for this test.</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
