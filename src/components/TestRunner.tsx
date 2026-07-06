"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type TestCompleteMessage = {
  type: "bandpath:test-complete";
  testId: string;
  testType: "reading" | "listening";
  scoreRaw: number;
  totalQuestions: number;
  scoreBand: number;
  timeSpentSeconds: number;
  answers: Record<string, string>;
};

export function TestRunner({ testId, testFile }: { testId: string; testFile: string }) {
  const router = useRouter();

  useEffect(() => {
    function handleMessage(e: MessageEvent<TestCompleteMessage>) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "bandpath:test-complete" || e.data.testId !== testId) return;

      fetch("/api/tests/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: e.data.testId,
          testType: e.data.testType,
          scoreRaw: e.data.scoreRaw,
          scoreBand: e.data.scoreBand,
          timeSpentSeconds: e.data.timeSpentSeconds,
          answers: e.data.answers,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) router.push(`/results/${data.id}`);
        });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [testId, router]);

  return (
    <iframe src={testFile} className="fixed inset-0 h-screen w-screen border-0" title="BandPath test" />
  );
}
