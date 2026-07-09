"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  X,
  ArrowRight,
  Volume2,
  Lightbulb,
  Layers,
  BookOpen,
  Flame,
  Zap,
} from "lucide-react";

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

function speak(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
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
  testTitle = "Vocabulary",
  partLabel,
  backHref,
}: {
  testId?: string;
  part?: number;
  testTitle?: string;
  partLabel?: string;
  backHref?: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [words, setWords] = useState<VocabWord[]>([]);
  const [index, setIndex] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streakCount, setStreakCount] = useState<number | null>(null);
  const [masteredThisSession, setMasteredThisSession] = useState(0);
  const [correctSpellingCount, setCorrectSpellingCount] = useState(0);

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

  const contextLine = partLabel ? `${partLabel} · ${testTitle}` : testTitle;
  const exitHref = backHref || "/vocabulary";

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
      <SessionShell index={index} total={words.length} mode="learn" contextLine={contextLine} exitHref={exitHref}>
        <LearnStage
          word={words[index]}
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
        />
      </SessionShell>
    );
  }

  if (stage === "quiz") {
    return (
      <SessionShell index={index} total={words.length} mode="quiz" contextLine={contextLine} exitHref={exitHref}>
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
        />
      </SessionShell>
    );
  }

  if (stage === "spelling") {
    return (
      <SessionShell index={index} total={words.length} mode="spelling" contextLine={contextLine} exitHref={exitHref}>
        <SpellingStage
          word={words[index]}
          onAnswer={async (correct) => {
            const w = words[index];
            const res = await postProgress(w.id, "spelling", correct);
            setXpEarned((xp) => xp + (res.xpAwarded ?? 0));
            if (correct) setCorrectSpellingCount((c) => c + 1);
            if (res.status === "mastered") setMasteredThisSession((m) => m + 1);
            if (typeof res.streakCount === "number") setStreakCount(res.streakCount);
          }}
          onNext={() => {
            if (index + 1 < words.length) {
              setIndex(index + 1);
            } else {
              setStage("summary");
            }
          }}
        />
      </SessionShell>
    );
  }

  // summary
  const accuracy = words.length ? Math.round((correctSpellingCount / words.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-[28px]">
        <div
          className="pointer-events-none absolute left-1/2 top-4 h-[220px] w-[220px] -translate-x-1/2 rounded-full opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(46,213,115,.2), rgba(0,196,255,.08), transparent 65%)",
            animation: "bp-floatglow 5s ease-in-out infinite",
          }}
        />

        <div className="relative flex justify-center gap-2 pt-2">
          <span className="text-[28px]" style={{ animation: "bp-popin .6s cubic-bezier(.34,1.56,.64,1) .25s both" }}>⭐</span>
          <span className="text-[38px]" style={{ animation: "bp-popin .6s cubic-bezier(.34,1.56,.64,1) .05s both" }}>⭐</span>
          <span className="text-[28px]" style={{ animation: "bp-popin .6s cubic-bezier(.34,1.56,.64,1) .45s both" }}>⭐</span>
        </div>

        <div className="relative mt-3 text-center" style={{ animation: "bp-slidein .5s ease .1s both" }}>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            {partLabel ? `${partLabel} Complete!` : "Session Complete!"}
          </div>
          <div className="mt-1 text-sm text-white/45">{testTitle}</div>
        </div>

        <div
          className="relative mt-4 rounded-[20px] border border-bp-warning/25 bg-gradient-to-br from-bp-warning/15 to-bp-card/70 p-5 text-center"
          style={{ animation: "bp-slidein .5s ease .3s both" }}
        >
          <Zap className="mx-auto h-6 w-6 text-bp-warning" />
          <div className="text-[44px] font-extrabold leading-none tracking-tight text-bp-warning">
            +{xpEarned}
          </div>
          <div className="mt-1 text-sm font-semibold text-white/50">XP earned this session</div>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2" style={{ animation: "bp-slidein .5s ease .4s both" }}>
          <div className="rounded-2xl border border-white/[0.07] bg-bp-card/60 p-3 text-center">
            <div className="text-xl font-extrabold tracking-tight text-white">{words.length}</div>
            <div className="mt-1 text-[9.5px] font-semibold text-white/42">Practiced</div>
          </div>
          <div className="rounded-2xl border border-bp-success/20 bg-bp-card/60 p-3 text-center">
            <div className="text-xl font-extrabold tracking-tight text-bp-success">+{masteredThisSession}</div>
            <div className="mt-1 text-[9.5px] font-semibold text-white/42">Mastered</div>
          </div>
          <div className="rounded-2xl border border-bp-warning/20 bg-bp-card/60 p-3 text-center">
            <div className="text-xl font-extrabold tracking-tight text-bp-warning">{streakCount ?? "—"}</div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <Flame className="bp-flame h-2.5 w-2.5 text-bp-warning" />
              <span className="text-[9.5px] font-semibold text-white/42">Streak</span>
            </div>
          </div>
        </div>

        <div
          className="relative mt-3 rounded-2xl border border-white/[0.07] bg-bp-card/60 p-3.5"
          style={{ animation: "bp-slidein .5s ease .5s both" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/65">Session accuracy</span>
            <span className="text-xs font-bold text-bp-success">{accuracy}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-bp-success to-[#00c8a0]"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        <div className="relative mt-4 flex flex-col gap-2.5" style={{ animation: "bp-slidein .5s ease .6s both" }}>
          {backHref && (
            <button
              onClick={() => router.push(backHref)}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] text-sm font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)]"
            >
              <Layers className="h-[17px] w-[17px]" />
              Choose Another Part
            </button>
          )}
          <Link
            href="/vocabulary"
            className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.04] text-sm font-semibold text-white/70"
          >
            <BookOpen className="h-[17px] w-[17px]" />
            Vocabulary Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

function SessionShell({
  index,
  total,
  mode,
  contextLine,
  exitHref,
  children,
}: {
  index: number;
  total: number;
  mode: "learn" | "quiz" | "spelling";
  contextLine: string;
  exitHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const modeStyles = {
    learn: "border-bp-accent/30 bg-bp-accent/15 text-[#5fdcff]",
    quiz: "border-bp-warning/30 bg-bp-warning/15 text-[#ffb938]",
    spelling: "border-bp-danger/30 bg-bp-danger/15 text-[#ff8787]",
  };

  return (
    <div className="mx-auto flex max-w-md flex-col">
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => router.push(exitHref)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-white/65"
        >
          <X className="h-[15px] w-[15px]" />
        </button>
        <div className="flex flex-1 items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i < index
                  ? "bg-bp-success"
                  : i === index
                    ? "bg-bp-accent shadow-[0_0_7px_rgba(0,196,255,0.7)]"
                    : "bg-white/[0.12]"
              }`}
            />
          ))}
        </div>
        <span className="flex-shrink-0 text-[11px] font-bold text-white/45">
          {index + 1} / {total}
        </span>
      </div>

      <div className="mt-3.5 flex items-center gap-1.5">
        <span
          className={`rounded-full border px-2.5 py-1 text-[9.5px] font-bold tracking-wider ${modeStyles[mode]}`}
        >
          {mode.toUpperCase()}
        </span>
        <span className="truncate text-[10.5px] font-medium text-white/40">{contextLine}</span>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function LearnStage({ word, onNext }: { word: VocabWord; onNext: () => void }) {
  return (
    <>
      <div className="relative flex flex-col overflow-hidden rounded-[22px] border border-bp-accent/25 bg-gradient-to-br from-[#0d3a5c] to-[#0a2d4a] p-5 shadow-[0_22px_48px_-20px_rgba(0,196,255,0.4)]">
        <div className="flex items-center justify-end">
          <button
            onClick={() => speak(word.word)}
            className="flex items-center text-white/40 transition-colors hover:text-bp-accent"
            aria-label="Play pronunciation"
          >
            <Volume2 className="h-[17px] w-[17px]" />
          </button>
        </div>

        <div className="mt-3 text-[34px] font-extrabold leading-tight tracking-tight text-white">
          {word.word}
        </div>

        <div className="mt-3 text-[13.5px] font-medium leading-relaxed text-white/80">
          {word.meaning}
        </div>

        <div className="my-3.5 h-px bg-white/[0.07]" />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex-shrink-0 text-base">🇺🇿</span>
            <div>
              <div className="text-[9px] font-bold tracking-wide text-white/35">UZBEK</div>
              <div className="mt-0.5 text-[13px] font-semibold text-white/75">{word.uz}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex-shrink-0 text-base">🇷🇺</span>
            <div>
              <div className="text-[9px] font-bold tracking-wide text-white/35">RUSSIAN</div>
              <div className="mt-0.5 text-[13px] font-semibold text-white/75">{word.ru}</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] text-[15px] font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)] transition-opacity hover:opacity-90"
      >
        Next Word <ArrowRight className="h-[18px] w-[18px]" />
      </button>
    </>
  );
}

function QuizStage({
  words,
  index,
  onAnswer,
  onNext,
}: {
  words: VocabWord[];
  index: number;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const w = words[index];
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo(() => {
    const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3);
    return shuffle([w, ...others]);
  }, [w, words]);

  function handleSelect(opt: VocabWord) {
    if (selected) return;
    setSelected(opt.id);
    onAnswer(opt.id === w.id);
  }

  function handleNext() {
    setSelected(null);
    onNext();
  }

  return (
    <>
      <p className="text-[12.5px] font-medium text-white/55">What is the meaning of:</p>
      <div className="mb-0.5 mt-0.5 text-[32px] font-extrabold leading-tight tracking-tight text-white">
        {w.word}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {options.map((opt) => {
          const isCorrect = opt.id === w.id;
          const isSelected = selected === opt.id;
          const showResult = selected !== null;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              disabled={showResult}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                showResult && isCorrect
                  ? "border-bp-success bg-bp-success/[0.11] shadow-[0_0_18px_-6px_rgba(46,213,115,0.35)]"
                  : showResult && isSelected && !isCorrect
                    ? "border-bp-danger bg-bp-danger/[0.09]"
                    : "border-white/[0.07] bg-bp-card/40 opacity-90"
              }`}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  showResult && isCorrect
                    ? "bg-bp-success text-[#06243c]"
                    : showResult && isSelected && !isCorrect
                      ? "border-[1.5px] border-bp-danger bg-bp-danger/20 text-bp-danger"
                      : "border-[1.5px] border-white/20 text-white/45"
                }`}
              >
                {showResult && isCorrect ? "✓" : showResult && isSelected && !isCorrect ? "✕" : ""}
              </span>
              <span
                className={`text-[13.5px] font-medium ${
                  showResult && isCorrect ? "font-semibold text-white" : "text-white/65"
                }`}
              >
                {opt.meaning}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          onClick={handleNext}
          className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] text-[15px] font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)] transition-opacity hover:opacity-90"
        >
          Next <ArrowRight className="h-[18px] w-[18px]" />
        </button>
      )}
    </>
  );
}

function SpellingStage({
  word,
  onAnswer,
  onNext,
}: {
  word: VocabWord;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);

  function handleCheck() {
    if (checked !== null) return;
    const correct = value.trim().toLowerCase() === word.word.toLowerCase();
    setChecked(correct);
    onAnswer(correct);
  }

  function handleNext() {
    setValue("");
    setChecked(null);
    onNext();
  }

  return (
    <>
      <div className="rounded-[18px] border border-white/[0.07] bg-bp-card/60 p-4">
        <div className="mb-1.5 text-[9px] font-bold tracking-wide text-white/42">DEFINITION</div>
        <div className="text-[13.5px] font-medium leading-relaxed text-white">{word.meaning}</div>
        <div className="my-2.5 h-px bg-white/[0.07]" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 text-sm">🇺🇿</span>
            <span className="text-xs font-medium text-white/62">{word.uz}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 text-sm">🇷🇺</span>
            <span className="text-xs font-medium text-white/62">{word.ru}</span>
          </div>
        </div>
      </div>

      <p className="mb-2.5 mt-4 text-center text-xs font-medium text-white/40">
        Type the English word
      </p>

      <div className="relative">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          disabled={checked !== null}
          placeholder="…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`h-[52px] w-full rounded-2xl border-[1.5px] px-4 text-center text-base font-semibold outline-none transition-colors ${
            checked === true
              ? "border-bp-success bg-bp-success/[0.08] text-[#5fe6a0] shadow-[0_0_18px_-4px_rgba(46,213,115,0.3)]"
              : checked === false
                ? "border-bp-danger bg-bp-danger/[0.07] text-[#ff8787] shadow-[0_0_18px_-4px_rgba(255,107,107,0.28)]"
                : "border-bp-border bg-bp-bg text-white focus:border-bp-accent"
          }`}
        />
        {checked !== null && (
          <div
            className={`absolute right-3.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] ${
              checked ? "border-bp-success bg-bp-success/20" : "border-bp-danger bg-bp-danger/20"
            }`}
          >
            <span className={`text-xs font-bold ${checked ? "text-bp-success" : "text-bp-danger"}`}>
              {checked ? "✓" : "✕"}
            </span>
          </div>
        )}
      </div>

      {checked === false && (
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[13px] border border-bp-success/20 bg-bp-success/[0.07] p-3">
          <Lightbulb className="h-[15px] w-[15px] flex-shrink-0 text-bp-success" />
          <div>
            <div className="text-[9.5px] font-semibold tracking-wide text-white/45">
              CORRECT SPELLING
            </div>
            <div className="mt-0.5 text-sm font-bold tracking-wide text-[#4fe08c]">{word.word}</div>
          </div>
        </div>
      )}

      {checked === null ? (
        <button
          onClick={handleCheck}
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] text-[15px] font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)] transition-opacity hover:opacity-90"
        >
          Check
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bp-accent to-[#0098e0] text-[15px] font-bold text-[#06243c] shadow-[0_14px_30px_-10px_rgba(0,196,255,0.7)] transition-opacity hover:opacity-90"
        >
          Next Word <ArrowRight className="h-[18px] w-[18px]" />
        </button>
      )}
    </>
  );
}
