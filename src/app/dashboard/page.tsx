import { AppHeader } from "@/components/AppHeader";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="/dashboard" />
      <main className="flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-white/50">
          Placeholder — streak, band estimate, and recent results will render here once
          Supabase auth + data are wired up (Step 2–4).
        </p>
      </main>
    </div>
  );
}
