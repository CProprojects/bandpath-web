import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Headphones, PlayCircle, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTestById } from "@/lib/tests";
import { getWordsForTest } from "@/lib/vocab";

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
  const Icon = test.type === "reading" ? BookOpen : Headphones;

  return (
    <AppShell active="/tests">
      <Link
        href="/tests"
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white/70"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Test Library
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
            test.type === "reading"
              ? "from-bp-accent/20 to-bp-accent/5 text-bp-accent"
              : "from-bp-warning/20 to-bp-warning/5 text-bp-warning"
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
          className="flex flex-col gap-2 rounded-2xl border border-bp-accent/25 bg-gradient-to-br from-bp-accent/10 to-bp-card/70 p-6 shadow-[0_10px_28px_-16px_rgba(0,196,255,0.5)] transition-colors hover:border-bp-accent/50"
        >
          <PlayCircle className="h-6 w-6 text-bp-accent" />
          <span className="text-lg font-bold text-white">Start Test</span>
          <span className="text-sm text-white/50">
            Take the full {test.type} test under real exam conditions.
          </span>
        </Link>

        {hasVocab ? (
          <Link
            href={`/vocabulary/${test.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-bp-success/25 bg-gradient-to-br from-bp-success/10 to-bp-card/70 p-6 shadow-[0_10px_28px_-16px_rgba(46,213,115,0.4)] transition-colors hover:border-bp-success/50"
          >
            <GraduationCap className="h-6 w-6 text-bp-success" />
            <span className="text-lg font-bold text-white">Practice Vocabulary</span>
            <span className="text-sm text-white/50">
              Learn the {vocabWords.length} key words from this test — earn XP and build your streak.
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-bp-border bg-bp-card/50 p-6 opacity-60">
            <GraduationCap className="h-6 w-6 text-white/40" />
            <span className="text-lg font-bold text-white">Practice Vocabulary</span>
            <span className="text-sm text-white/50">Coming soon for this test.</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
