"use client";

import { useEffect } from "react";

type QuestionResult = {
  id: number;
  type: string;
  correct: boolean;
  answered: boolean;
};

type TestCompleteMessage = {
  type: "bandpath:test-complete";
  testId: string;
  testType: "reading" | "listening";
  scoreRaw: number;
  totalQuestions: number;
  scoreBand: number;
  timeSpentSeconds: number;
  answers: Record<string, string>;
  questionResults?: QuestionResult[];
};

export function TestRunner({ testId, testFile }: { testId: string; testFile: string }) {
  useEffect(() => {
    function handleMessage(e: MessageEvent<TestCompleteMessage>) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "bandpath:test-complete" || e.data.testId !== testId) return;

      // Save the result in the background — the test's own results screen
      // (with band score, per-passage breakdown, and answer review) stays on
      // screen so the student can review it; they leave via its own "Back to
      // Home" button whenever they're ready, not on an automatic redirect.
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
          questionResults: e.data.questionResults,
        }),
      }).catch((err) => console.error("Failed to save test result:", err));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [testId]);

  return (
    <iframe src={testFile} className="fixed inset-0 h-screen w-screen border-0" title="BandPath test" />
  );
}
