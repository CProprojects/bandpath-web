import { AppHeader } from "@/components/AppHeader";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="/tests" />
      <main className="flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Result: {id}</h1>
        <p className="mt-2 text-white/50">
          Placeholder — band score, per-question review, and hints go here (Step 5).
        </p>
      </main>
    </div>
  );
}
