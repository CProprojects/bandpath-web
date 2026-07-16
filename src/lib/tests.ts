export type TestMeta = {
  id: string;
  title: string;
  type: "reading" | "listening";
  questionCount: number;
  durationMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  file: string;
  requiresPro: boolean;
};

export const TESTS: TestMeta[] = [
  {
    id: "reading-test-1",
    title: "Reading Test 1",
    type: "reading",
    questionCount: 40,
    durationMinutes: 60,
    difficulty: "Easy",
    file: "/tests/reading-test-1.html",
    requiresPro: false,
  },
  {
    id: "listening-test-1",
    title: "Listening Test 1",
    type: "listening",
    questionCount: 40,
    durationMinutes: 30,
    difficulty: "Easy",
    file: "/tests/listening-test-1.html",
    requiresPro: false,
  },
  ...Array.from({ length: 10 }, (_, i) => i + 2).map((n) => ({
    id: `reading-test-${n}`,
    title: `Reading Test ${n}`,
    type: "reading" as const,
    questionCount: 40,
    durationMinutes: 60,
    difficulty: "Medium" as const,
    file: `/tests/reading-test-${n}.html`,
    requiresPro: n === 10 || n === 11,
  })),
  ...Array.from({ length: 6 }, (_, i) => i + 2).map((n) => ({
    id: `listening-test-${n}`,
    title: `Listening Test ${n}`,
    type: "listening" as const,
    questionCount: 40,
    durationMinutes: 30,
    difficulty: "Medium" as const,
    file: `/tests/listening-test-${n}.html`,
    requiresPro: n === 6 || n === 7,
  })),
];

export function getTestById(id: string) {
  return TESTS.find((t) => t.id === id);
}
