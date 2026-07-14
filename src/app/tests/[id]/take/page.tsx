import { redirect } from "next/navigation";
import { TestRunner } from "@/components/TestRunner";
import { WritingTestRunner } from "@/components/WritingTestRunner";
import { createClient } from "@/lib/supabase/server";
import { getTestById } from "@/lib/tests";
import { getWritingTestById } from "@/lib/writingTests";

export default async function TestRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = getTestById(id);
  const writingTest = test ? null : getWritingTestById(id);

  if (!test && !writingTest) {
    redirect("/tests");
  }

  const requiresPro = test?.requiresPro ?? writingTest!.requiresPro;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (requiresPro) {
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profile?.plan !== "pro") {
      redirect("/upgrade");
    }
  }

  if (writingTest) {
    return <WritingTestRunner test={writingTest} />;
  }

  return <TestRunner testId={test!.id} testFile={test!.file} />;
}
