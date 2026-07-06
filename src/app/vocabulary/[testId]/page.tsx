import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { TESTS } from "@/lib/tests";
import { VocabSession } from "@/components/VocabSession";

export default async function VocabularySessionPage({
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

  const isAll = testId === "all";
  const test = isAll ? undefined : TESTS.find((t) => t.id === testId);

  if (!isAll && !test) {
    redirect("/vocabulary");
  }

  return (
    <AppShell active="/vocabulary">
      <VocabSession
        testId={isAll ? undefined : testId}
        title={isAll ? "Today's Practice" : test!.title}
      />
    </AppShell>
  );
}
