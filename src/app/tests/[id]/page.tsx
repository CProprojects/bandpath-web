import { AppShell } from "@/components/AppShell";

export default async function TestRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell active="/tests">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Test: {id}</h1>
      <p className="mt-2 text-white/50">
        Placeholder — this will host the test file in an iframe with postMessage
        result reporting (Step 5).
      </p>
    </AppShell>
  );
}
