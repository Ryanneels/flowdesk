"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  scheduled_start: string | null;
  source: string;
  project_id: string | null;
  rock_id: string | null;
  calendar_event_id: string | null;
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const url = filterSource ? `/api/tasks?source=${filterSource}` : "/api/tasks";
    const res = await fetch(url);
    const d = (await res.json()) as { tasks?: Task[] };
    setTasks(d.tasks ?? []);
    setLoading(false);
  }, [filterSource]);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), source: "manual" }),
    });
    if (res.ok) {
      setNewTitle("");
      load();
    }
  };

  const setStatus = async (taskId: string, status: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  };

  const sourceLabel = (s: string) => {
    if (s === "os_rock") return "OS";
    if (s === "project") return "PM";
    if (s === "email") return "Email";
    return s;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">My Tasks</h1>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Source</span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All</option>
            <option value="os_rock">From OS</option>
            <option value="project">From Projects</option>
            <option value="email">From Email</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <input
          type="text"
          placeholder="New task"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={addTask}
          disabled={!newTitle.trim()}
          className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Add task
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-slate-500">No tasks. Add one or create Rocks/Projects.</p>
      ) : (
        <ul className="space-y-2">
          {tasks
            .filter((t) => t.status !== "done")
            .map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{t.title}</p>
                  <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className={
                        t.source === "os_rock"
                          ? "rounded bg-teal-100 px-1 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200"
                          : t.source === "project"
                            ? "rounded bg-purple-100 px-1 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                            : ""
                      }
                    >
                      {sourceLabel(t.source)}
                    </span>
                    <span>{t.priority}</span>
                    {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString()}</span>}
                    {t.calendar_event_id && <span className="text-green-600 dark:text-green-400">On calendar</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {t.status !== "done" && (
                    <button
                      type="button"
                      onClick={() => setStatus(t.id, "done")}
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                    >
                      Done
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
