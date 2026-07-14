"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, AlertTriangle, Clock, Settings, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/Logo";
import { WritingChart } from "@/components/WritingChart";
import type { WritingTestMeta } from "@/lib/writingTests";

const FONT_SIZES = [15, 18, 22] as const;

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function WritingTestRunner({ test }: { test: WritingTestMeta }) {
  const router = useRouter();
  const totalSeconds = test.durationMinutes * 60;

  const storageKey = (suffix: string) => `writing_${test.id}_${suffix}`;

  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [activeTask, setActiveTask] = useState<1 | 2>(1);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES[0]);
  const startTimeRef = useRef<number>(Date.now());
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    try {
      const t1 = localStorage.getItem(storageKey("task1"));
      const t2 = localStorage.getItem(storageKey("task2"));
      const timer = localStorage.getItem(storageKey("timer"));
      const started = localStorage.getItem(storageKey("started"));
      if (t1) setTask1(t1);
      if (t2) setTask2(t2);
      if (timer) {
        const v = parseInt(timer, 10);
        if (v > 0 && v <= totalSeconds) setSecondsLeft(v);
      }
      if (started) startTimeRef.current = parseInt(started, 10);
      else localStorage.setItem(storageKey("started"), String(startTimeRef.current));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey("task1"), task1);
  }, [task1]);

  useEffect(() => {
    localStorage.setItem(storageKey("task2"), task2);
  }, [task2]);

  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  const submit = useRef<() => void>(() => {});

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!hasSubmittedRef.current) submit.current();
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1;
        localStorage.setItem(storageKey("timer"), String(next));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  async function handleSubmit() {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);
    setError(null);

    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch("/api/writing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          task1Response: task1,
          task2Response: task2,
          task1WordCount: wordCount(task1),
          task2WordCount: wordCount(task2),
          timeSpentSeconds,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Submission failed. Please try again.");
        setSubmitting(false);
        hasSubmittedRef.current = false;
        return;
      }

      ["task1", "task2", "timer", "started"].forEach((k) => localStorage.removeItem(storageKey(k)));
      router.push(`/writing/results/${data.id}`);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
      hasSubmittedRef.current = false;
    }
  }
  submit.current = handleSubmit;

  const critical = secondsLeft <= 300;
  const warn = secondsLeft <= 600 && !critical;

  if (submitting) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bp-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-bp-accent border-t-transparent" />
        <p className="text-white/70">Grading your essay…</p>
        <p className="max-w-xs text-center text-xs text-white/40">
          This usually takes 10-20 seconds while the AI reviews Task 1 and Task 2 against the official band
          descriptors.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-bp-bg">
      <header className="relative flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-bp-border px-4 py-3 sm:px-6">
        <Logo size={30} />
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums ${
              critical
                ? "animate-pulse border-bp-danger/50 bg-bp-danger/20 text-bp-danger"
                : warn
                  ? "border-bp-warning/40 bg-bp-warning/15 text-bp-warning"
                  : "border-bp-danger/35 bg-bp-danger/15 text-bp-danger/90"
            }`}
          >
            <Clock className="h-3.5 w-3.5 opacity-85" />
            {formatTime(secondsLeft)}
          </div>
          <div ref={settingsRef} className="contents">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              title="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-bp-accent/20"
            >
              <Settings className="h-4 w-4" />
            </button>
            {settingsOpen && (
              <div className="absolute right-4 top-[58px] z-[2000] min-w-[210px] rounded-xl border border-bp-border bg-bp-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:right-6">
                <h3 className="border-b border-bp-border pb-2.5 text-[13px] font-bold uppercase tracking-wide text-white">
                  Settings
                </h3>
                <div className="mt-3">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/40">
                    Font Size
                  </label>
                  <div className="flex gap-2">
                    {FONT_SIZES.map((size, i) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        style={{ fontSize: 12 + i * 4 }}
                        className={`flex-1 rounded-lg border-2 py-1.5 font-bold transition-colors ${
                          fontSize === size
                            ? "border-bp-accent bg-bp-accent/15 text-bp-accent"
                            : "border-bp-border text-white/60 hover:text-white"
                        }`}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-4 py-1.5 text-sm font-bold text-[#06243c]"
          >
            <Send className="h-4 w-4" />
            Submit
          </button>
        </div>
      </header>

      <div className="flex flex-shrink-0 gap-2 border-b border-bp-border px-4 py-2 sm:px-6">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            onClick={() => setActiveTask(n)}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
              activeTask === n
                ? "bg-gradient-to-r from-bp-accent to-[#0098e0] text-[#06243c]"
                : "text-white/50 hover:text-white"
            }`}
          >
            Task {n}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {activeTask === 1 ? (
            <>
              <p className="leading-relaxed text-white/70" style={{ fontSize }}>
                {test.task1Prompt}
              </p>
              <WritingChart data={test.task1Chart} />
              <TaskEditor
                value={task1}
                onChange={setTask1}
                minWords={test.task1MinWords}
                placeholder="Write your Task 1 response here…"
                fontSize={fontSize}
              />
            </>
          ) : (
            <>
              <p className="leading-relaxed text-white/70" style={{ fontSize }}>
                {test.task2Prompt}
              </p>
              <TaskEditor
                value={task2}
                onChange={setTask2}
                minWords={test.task2MinWords}
                placeholder="Write your Task 2 response here…"
                fontSize={fontSize}
              />
            </>
          )}

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-bp-border bg-bp-card/30 p-3.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
            <p className="text-[11.5px] leading-relaxed text-white/40">
              This is an independent IELTS Academic Writing practice test created by BandPath. It is not
              affiliated with, endorsed by, or connected to IELTS, the British Council, IDP Education, or
              Cambridge Assessment English. Band scores and feedback are generated by AI for practice purposes
              only and may not match your official IELTS Writing result.
            </p>
          </div>
        </div>
      </main>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-bp-border bg-bp-card p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bp-accent/15 text-bp-accent">
              <Send className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white">Submit for grading?</h2>
            <p className="mt-1.5 text-sm text-white/50">
              Task 1: {wordCount(task1)} words · Task 2: {wordCount(task2)} words. You can&apos;t edit your
              responses after submitting.
            </p>
            {error && <p className="mt-3 text-sm text-bp-danger">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl border border-bp-border py-2.5 text-sm font-bold text-white/70 hover:text-white"
              >
                Keep writing
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  handleSubmit();
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-bp-accent to-[#0098e0] py-2.5 text-sm font-bold text-[#06243c]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskEditor({
  value,
  onChange,
  minWords,
  placeholder,
  fontSize,
}: {
  value: string;
  onChange: (v: string) => void;
  minWords: number;
  placeholder: string;
  fontSize: number;
}) {
  const count = wordCount(value);
  const underMin = count < minWords;

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={14}
        style={{ fontSize }}
        className="w-full resize-y rounded-2xl border border-bp-border bg-bp-card/60 p-4 leading-relaxed text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
      />
      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
        {underMin && <AlertTriangle className="h-3.5 w-3.5 text-bp-warning" />}
        <span className={underMin ? "text-bp-warning" : "text-white/40"}>
          {count} / {minWords} words minimum
        </span>
      </div>
    </div>
  );
}
