"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDateStr(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function NeonDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? parseDateStr(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const todayStr = toDateStr(new Date());
  const minStr = minDate ?? "";

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const displayLabel = value ? parseDateStr(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none transition-colors ${
          open ? "border-bp-accent" : "border-bp-border"
        } bg-bp-bg ${value ? "text-white" : "text-white/40"}`}
      >
        <Calendar className="h-4 w-4 flex-shrink-0 text-bp-accent" />
        {displayLabel}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 overflow-hidden rounded-2xl border border-bp-accent/25 bg-bp-card p-4 shadow-[0_20px_50px_-15px_rgba(0,196,255,0.4)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-bold text-white">
              {MONTHS[month]} {year}
            </div>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] font-bold text-white/35">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map(({ date, inMonth }, i) => {
              const dateStr = toDateStr(date);
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              const isDisabled = minStr && dateStr < minStr;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!isDisabled}
                  onClick={() => {
                    onChange(dateStr);
                    setOpen(false);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isDisabled
                      ? "cursor-not-allowed text-white/15"
                      : isSelected
                        ? "bg-gradient-to-br from-bp-accent to-[#0098e0] text-[#06243c] shadow-[0_0_14px_-2px_rgba(0,196,255,0.8)]"
                        : isToday
                          ? "border border-bp-success/60 text-bp-success"
                          : inMonth
                            ? "text-white/75 hover:bg-white/8"
                            : "text-white/20 hover:bg-white/5"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
