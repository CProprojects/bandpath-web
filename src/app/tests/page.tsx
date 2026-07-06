import { AppHeader } from "@/components/AppHeader";

export default function TestsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="/tests" />
      <main className="flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Test Library</h1>
        <p className="mt-2 text-white/50">
          Placeholder — the free/pro gated test grid goes here (Step 5).
        </p>
      </main>
    </div>
  );
}
