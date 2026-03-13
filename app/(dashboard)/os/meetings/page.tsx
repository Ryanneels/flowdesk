"use client";

import { useEffect, useState } from "react";

const L10_SECTIONS = [
  { name: "Segue", mins: 5 },
  { name: "Scorecard", mins: 5 },
  { name: "Rocks", mins: 5 },
  { name: "People", mins: 5 },
  { name: "To-Dos", mins: 5 },
  { name: "IDS (Issues)", mins: 60 },
  { name: "Conclude", mins: 5 },
];

export default function MeetingsPage() {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(L10_SECTIONS[0].mins * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const startSection = (index: number) => {
    setSectionIndex(index);
    setSecondsLeft(L10_SECTIONS[index].mins * 60);
    setRunning(true);
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">L10 Meeting</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Current: {L10_SECTIONS[sectionIndex].name} ({L10_SECTIONS[sectionIndex].mins} min)
        </p>
        <p className="mt-2 text-4xl font-mono font-bold text-slate-900 dark:text-white">
          {m}:{s.toString().padStart(2, "0")}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setRunning(!running)}
            className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            {running ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => setRunning(false)}
            className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Stop
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {L10_SECTIONS.map((sec, i) => (
          <li key={sec.name}>
            <button
              type="button"
              onClick={() => startSection(i)}
              className={`w-full rounded-lg px-4 py-2 text-left text-sm ${
                sectionIndex === i
                  ? "bg-teal-100 font-medium text-teal-900 dark:bg-teal-900/30 dark:text-teal-200"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {sec.name} — {sec.mins} min
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
