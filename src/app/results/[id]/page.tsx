import { AppShell } from "@/components/AppShell";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell active="/tests">
      <h1 className="text-2xl font-bold text-white md:text-3xl">Result: {id}</h1>
      <p className="mt-2 text-white/50">
        Placeholder — band score, per-question review, and hints go here (Step 5).
      </p>
    </AppShell>
  );
}
