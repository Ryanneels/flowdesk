"use client";

import { useCallback, useEffect, useState } from "react";

type CalEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    const res = await fetch(
      `/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&maxResults=100`
    );
    const data = (await res.json()) as { events?: CalEvent[] };
    setEvents(data.events ?? []);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
  const eventsForDay = (day: Date) => {
    const dayStr = day.toISOString().slice(0, 10);
    return events.filter((e) => {
      const start = e.start?.dateTime ?? e.start?.date;
      return start?.startsWith(dayStr);
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Calendar & Tasks</h1>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={prevWeek}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          ← Prev week
        </button>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Week of {weekStart.toLocaleDateString()}
        </span>
        <button
          type="button"
          onClick={nextWeek}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          Next week →
        </button>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch("/api/calendar/schedule", { method: "POST" });
            const d = await res.json();
            alert(JSON.stringify(d, null, 2));
          }}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Run AI schedule (stub)
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/30"
            >
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <ul className="mt-2 space-y-1">
                {eventsForDay(day).map((e) => (
                  <li
                    key={e.id}
                    className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-900 dark:bg-blue-900/40 dark:text-blue-200"
                  >
                    {e.summary ?? "(no title)"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
