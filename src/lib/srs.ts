export type VocabStatus = "learning" | "review" | "mastered";

export type VocabProgressState = {
  status: VocabStatus;
  intervalDays: number;
  correctCount: number;
  wrongCount: number;
};

const INTERVALS = [1, 3, 7, 14, 30, 90];

export function nextReviewState(
  current: VocabProgressState,
  correct: boolean
): VocabProgressState & { nextReviewInDays: number } {
  if (correct) {
    const idx = Math.min(current.correctCount, INTERVALS.length - 1);
    const intervalDays = INTERVALS[idx];
    const mastered = idx >= INTERVALS.length - 1;
    return {
      status: mastered ? "mastered" : "review",
      intervalDays,
      correctCount: current.correctCount + 1,
      wrongCount: current.wrongCount,
      nextReviewInDays: intervalDays,
    };
  }

  return {
    status: "learning",
    intervalDays: INTERVALS[0],
    correctCount: 0,
    wrongCount: current.wrongCount + 1,
    nextReviewInDays: INTERVALS[0],
  };
}

export const DAILY_WORD_CAP = 25;
