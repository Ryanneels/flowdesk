"use client";

import { useCallback, useEffect, useState } from "react";

type Company = { id: string; name: string };
type Issue = {
  id: string;
  title: string;
  description: string | null;
  urgency: number;
  status: string;
  created_at: string;
};

export default function IssuesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetch("/api/os/companies")
      .then((r) => r.json())
      .then((d: { companies?: Company[] }) => {
        const list = d.companies ?? [];
        setCompanies(list);
        if (list.length && !companyId) setCompanyId(list[0].id);
      });
  }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const res = await fetch(`/api/os/issues?company_id=${companyId}`);
    const data = (await res.json()) as { issues?: Issue[] };
    setIssues(data.issues ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (companyId) load();
  }, [companyId, load]);

  const addIssue = async () => {
    if (!newTitle.trim() || !companyId) return;
    const res = await fetch("/api/os/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, title: newTitle.trim(), urgency: 3 }),
    });
    if (res.ok) {
      setNewTitle("");
      load();
    }
  };

  const solve = async (id: string) => {
    const res = await fetch(`/api/os/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "solved" }),
    });
    if (res.ok) load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600 dark:text-slate-400">Company</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New issue title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={addIssue}
          disabled={!newTitle.trim()}
          className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Add issue
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {issues.filter((i) => i.status === "open").map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{i.title}</p>
                <p className="text-xs text-slate-500">Urgency {i.urgency}</p>
              </div>
              <button
                type="button"
                onClick={() => solve(i.id)}
                className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
              >
                Mark solved
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
