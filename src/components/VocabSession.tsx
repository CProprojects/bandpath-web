"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type VocabWord = {
  id: string;
  testId: string;
  word: string;
  meaning: string;
  uz: string;
  ru: string;
};

type Stage = "loading" | "empty" | "learn" | "quiz" | "spelling" | "summary";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function postProgress(wordId: string, stage: "learn" | "quiz" | "spelling", correct?: boolean) {
  const res = await fetch("/api/vocab/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wordId, stage, correct }),
  });
  return res.json();
}

export function VocabSession({
  testId,
  part,
  title,
  backHref,
}: {
  testId?: string;
  part?: number;
  title: string;
  backHref?: string;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [words, setWords] = useState<VocabWord[]>([]);
  const [index, setIndex] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streakCount, setStreakCount] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (testId) params.set("testId", testId);
    if (part !== undefined) params.set("part", String(part));
    const qs = params.toString();
    const url = qs ? `/api/vocab/session?${qs}` : "/api/vocab/session";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setWords(data.words ?? []);
        setStage(data.words?.length ? "learn" : "empty");
      });
  }, [testId, part]);

  if (stage === "loading") {
    return <p className="mt-8 text-white/50">Loading today&apos;s words…</p>;
  }

  if (stage === "empty") {
    return (
      <div className="mt-8 rounded-2xl border border-bp-border bg-bp-card p-8 text-center">
        <p className="text-lg font-bold text-white">All caught up!</p>
        <p className="mt-2 text-sm text-white/50">No words due for review right now. Come back tomorrow.</p>
        <Link
          href="/vocabulary"
          className="mt-6 inline-block rounded-xl bg-bp-accent px-5 py-2.5 text-sm font-bold text-[#06243c]"
        >
          Back to Vocabulary
        </Link>
      </div>
    );
  }

  if (stage === "learn") {
    return (
      <LearnStage
        words={words}
        index={index}
        onNext={() => {
          const w = words[index];
          postProgress(w.id, "learn");
          if (index + 1 < words.length) {
            setIndex(index + 1);
          } else {
            setIndex(0);
            setStage("quiz");
          }
        }}
        title={title}
      />
    );
  }

  if (stage === "quiz") {
    return (
      <QuizStage
        words={words}
        index={index}
        onAnswer={async (correct) => {
          const w = words[index];
          const res = await postProgress(w.id, "quiz", correct);
          setXpEarned((xp) => xp + (res.xpAwarded ?? 0));
        }}
        onNext={() => {
          if (index + 1 < words.length) {
            setIndex(index + 1);
          } else {
            setIndex(0);
            setStage("spelling");
          }
        }}
        title={title}
      />
    );
  }

  if (stage === "spelling") {
    return (
      <SpellingStage
        words={words}
        index={index}
        onAnswer={async (correct) => {
          const w = words[index];
          const res = await postProgress(w.id, "spelling", correct);
          setXpEarned((xp) => xp + (res.xpAwarded ?? 0));
          if (typeof res.streakCount === "number") setStreakCount(res.streakCount);
        }}
        onNext={() => {
          if (index + 1 < words.length) {
            setIndex(index + 1);
          } else {
            setStage("summary");
          }
        }}
        title={title}
      />
    );
  }

  // summary
  return (
    <div className="mt-8 rounded-2xl border border-bp-border bg-bp-card p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-white/40">Session complete</p>
      <p className="mt-4 text-4xl font-bold text-bp-warning">+{xpEarned} XP</p>
      {streakCount !== null && (
        <p className="mt-2 text-sm text-white/50">{streakCount} day streak 🔥</p>
      )}
      <p className="mt-4 text-sm text-white/50">You practiced {words.length} words from {title}.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/vocabulary"
          className="rounded-xl border border-bp-border px-5 py-2.5 text-sm font-bold text-white/70"
        >
          Vocabulary Hub
        </Link>
        {backHref && (
          <Link
            href={backHref}
            className="rounded-xl bg-bp-accent px-5 py-2.5 text-sm font-bold text-[#06243c]"
          >
            Choose Another Part
          </Link>
        )}
      </div>
    </div>
  );
}

function ProgressDots({ total, index }: { total: number; index: number }) {
  return (
    <div className="mt-4 flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full ${i <= index ? "bg-bp-accent" : "bg-bp-border"}`}
        />
      ))}
    </div>
  );
}

function LearnStage({
  words,
  index,
  onNext,
  title,
}: {
  words: VocabWord[];
  index: number;
  onNext: () => void;
  title: string;
}) {
  const w = words[index];
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-white/40">
        {title} · Learn · {index + 1}/{words.length}
      </p>
      <ProgressDots total={words.length} index={index} />
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-bp-border bg-bp-card px-8 py-14 text-center">
        <div className="text-4xl font-extrabold text-white md:text-5xl">{w.word}</div>
        <div className="mt-6 max-w-md text-base text-white/70">{w.meaning}</div>
        <div className="mt-4 flex flex-col gap-1 text-sm text-white/40">
          <span>🇺🇿 {w.uz}</span>
          <span>🇷🇺 {w.ru}</span>
        </div>
      </div>
      <button
        onClick={onNext}
        className="mt-6 w-full rounded-2xl bg-bp-accent py-4 text-base font-bold text-[#06243c] transition-opacity hover:opacity-90"
      >
        {index + 1 < words.length ? "Next Word" : "Start Quiz"}
      </button>
    </div>
  );
}

function QuizStage({
  words,
  index,
  onAnswer,
  onNext,
  title,
}: {
  words: VocabWord[];
  index: number;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  title: string;
}) {
  const w = words[index];
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo(() => {
    const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3);
    return shuffle([w, ...others]);
  }, [w, words]);

  function handleSelect(word: VocabWord) {
    if (selected) return;
    setSelected(word.word);
    onAnswer(word.id === w.id);
  }

  function handleNext() {
    setSelected(null);
    onNext();
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-white/40">
        {title} · Quiz · {index + 1}/{words.length}
      </p>
      <ProgressDots total={words.length} index={index} />
      <div className="mt-8 rounded-2xl border border-bp-border bg-bp-card p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Which word means…
        </p>
        <p className="mt-3 text-lg font-semibold text-white">{w.meaning}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const isCorrect = opt.id === w.id;
          const isSelected = selected === opt.word;
          const showResult = selected !== null;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              disabled={showResult}
              className={`rounded-2xl border p-4 text-left text-base font-semibold transition-colors ${
                showResult && isCorrect
                  ? "border-bp-success bg-bp-success/15 text-bp-success"
                  : showResult && isSelected && !isCorrect
                    ? "border-bp-danger bg-bp-danger/15 text-bp-danger"
                    : "border-bp-border text-white/80"
              }`}
            >
              {opt.word}
            </button>
          );
        })}
      </div>
      {selected && (
        <button
          onClick={handleNext}
          className="mt-6 w-full rounded-2xl bg-bp-accent py-4 text-base font-bold text-[#06243c] transition-opacity hover:opacity-90"
        >
          {index + 1 < words.length ? "Next" : "Start Spelling"}
        </button>
      )}
    </div>
  );
}

function SpellingStage({
  words,
  index,
  onAnswer,
  onNext,
  title,
}: {
  words: VocabWord[];
  index: number;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  title: string;
}) {
  const w = words[index];
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);

  function handleCheck() {
    if (checked !== null) return;
    const correct = value.trim().toLowerCase() === w.word.toLowerCase();
    setChecked(correct);
    onAnswer(correct);
  }

  function handleNext() {
    setValue("");
    setChecked(null);
    onNext();
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-white/40">
        {title} · Spelling · {index + 1}/{words.length}
      </p>
      <ProgressDots total={words.length} index={index} />
      <div className="mt-8 rounded-2xl border border-bp-border bg-bp-card p-8 text-center">
        <p className="text-base text-white/70">{w.meaning}</p>
        <div className="mt-3 flex flex-col gap-1 text-sm text-white/40">
          <span>🇺🇿 {w.uz}</span>
          <span>🇷🇺 {w.ru}</span>
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          disabled={checked !== null}
          placeholder="Type the word…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mt-6 w-full rounded-xl border border-bp-border bg-bp-bg px-4 py-3 text-center text-lg font-semibold text-white outline-none focus:border-bp-accent"
        />
        {checked !== null && (
          <p className={`mt-3 text-sm font-semibold ${checked ? "text-bp-success" : "text-bp-danger"}`}>
            {checked ? "Correct!" : `Correct spelling: ${w.word}`}
          </p>
        )}
      </div>
      {checked === null ? (
        <button
          onClick={handleCheck}
          className="mt-6 w-full rounded-2xl bg-bp-accent py-4 text-base font-bold text-[#06243c] transition-opacity hover:opacity-90"
        >
          Check
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="mt-6 w-full rounded-2xl bg-bp-accent py-4 text-base font-bold text-[#06243c] transition-opacity hover:opacity-90"
        >
          {index + 1 < words.length ? "Next" : "Finish"}
        </button>
      )}
    </div>
  );
}
