import { redirect } from "next/navigation";
import { TestRunner } from "@/components/TestRunner";
import { createClient } from "@/lib/supabase/server";
import { getTestById } from "@/lib/tests";

export default async function TestRunnerPage({
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

  return <TestRunner testId={test.id} testFile={test.file} />;
}
