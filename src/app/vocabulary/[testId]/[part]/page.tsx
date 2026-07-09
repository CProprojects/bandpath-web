import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { TESTS } from "@/lib/tests";
import { getPartsForTest } from "@/lib/vocab";
import { VocabSession } from "@/components/VocabSession";

export default async function VocabularyPartPage({
  params,
}: {
  params: Promise<{ testId: string; part: string }>;
}) {
  const { testId, part } = await params;
  const partIndex = Number(part);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const test = TESTS.find((t) => t.id === testId);
  const parts = getPartsForTest(testId);

  if (!test || Number.isNaN(partIndex) || !parts[partIndex]) {
    redirect(`/vocabulary/${testId}`);
  }

  return (
    <AppShell active="/vocabulary">
      <div className="mx-auto w-full max-w-md">
        <VocabSession
          testId={testId}
          part={partIndex}
          testTitle={test!.title}
          partLabel={`Part ${partIndex + 1}`}
          backHref={`/vocabulary/${testId}`}
        />
      </div>
    </AppShell>
  );
}
