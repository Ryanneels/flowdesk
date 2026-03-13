"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const COLS = ["backlog", "in_progress", "in_review", "done"] as const;
const COL_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  source: string;
  project_id: string | null;
  rock_id: string | null;
  calendar_event_id: string | null;
};

export default function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async (pid: string) => {
    const res = await fetch(`/api/tasks?project_id=${pid}`);
    const d = (await res.json()) as { tasks?: Task[] };
    setTasks(d.tasks ?? []);
  }, []);

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.id);
      setLoading(true);
      load(p.id).finally(() => setLoading(false));
    });
  }, [params, load]);

  const addTask = async () => {
    if (!newTitle.trim() || !projectId) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), project_id: projectId, source: "project" }),
    });
    if (res.ok) {
      setNewTitle("");
      load(projectId);
    }
  };

  const moveTask = async (taskId: string, status: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load(projectId);
  };

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="text-sm text-slate-500 hover:underline">← Projects</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Project Board</h1>
      </div>
      <div className="flex gap-2">
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
          className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
        >
          Add task
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {COLS.map((status) => (
            <div
              key={status}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
            >
              <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {COL_LABELS[status]} ({byStatus(status).length})
              </h3>
              <ul className="space-y-2">
                {byStatus(status).map((t) => (
                  <li
                    key={t.id}
                    className="rounded border border-slate-200 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800/50"
                  >
                    <p className="font-medium text-slate-900 dark:text-white">{t.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.source === "os_rock" && (
                        <span className="rounded bg-teal-100 px-1 text-xs text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
                          from OS
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{t.priority}</span>
                      {t.due_date && (
                        <span className="text-xs text-slate-500">{new Date(t.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    {COLS.indexOf(t.status as typeof COLS[number]) > -1 && (
                      <div className="mt-2 flex gap-1">
                        {COLS.filter((s) => s !== t.status).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => moveTask(t.id, s)}
                            className="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-600 dark:text-slate-200"
                          >
                            → {COL_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    )}
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
