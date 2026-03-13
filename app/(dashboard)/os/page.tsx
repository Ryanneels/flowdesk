"use client";

import { useCallback, useEffect, useState } from "react";

type Company = { id: string; name: string };
type Rock = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  quarter: string;
  status: string;
  progress_pct: number | null;
  due_date: string | null;
};
type Milestone = { id: string; rock_id: string; title: string; due_date: string | null; completed: boolean; task_id: string | null };

export default function RocksPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newQuarter, setNewQuarter] = useState("Q2-2025");
  const [expandedRock, setExpandedRock] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});

  const loadCompanies = useCallback(async () => {
    const res = await fetch("/api/os/companies");
    const data = (await res.json()) as { companies?: Company[] };
    const list = data.companies ?? [];
    setCompanies(list);
    if (list.length > 0 && !companyId) setCompanyId(list[0].id);
  }, [companyId]);

  const loadRocks = useCallback(async () => {
    if (!companyId) return;
    const res = await fetch(`/api/os/rocks?company_id=${companyId}`);
    const data = (await res.json()) as { rocks?: Rock[] };
    setRocks(data.rocks ?? []);
  }, [companyId]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    loadRocks().finally(() => setLoading(false));
  }, [companyId, loadRocks]);

  const createCompany = async () => {
    const name = window.prompt("Company name");
    if (!name?.trim()) return;
    const res = await fetch("/api/os/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      const c = (await res.json()) as Company;
      setCompanies((prev) => [c, ...prev]);
      setCompanyId(c.id);
    }
  };

  const createRock = async () => {
    if (!newTitle.trim() || !companyId) return;
    const res = await fetch("/api/os/rocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, title: newTitle.trim(), quarter: newQuarter }),
    });
    if (res.ok) {
      setNewTitle("");
      loadRocks();
    }
  };

  const addMilestone = async (rockId: string) => {
    if (!milestoneTitle.trim()) return;
    const res = await fetch("/api/os/rock-milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rock_id: rockId, title: milestoneTitle.trim() }),
    });
    if (res.ok) {
      setMilestoneTitle("");
      setExpandedRock(null);
      loadRocks();
    }
  };

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-slate-600 dark:text-slate-400">No company yet. Create one to add Rocks.</p>
        <button
          type="button"
          onClick={createCompany}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Create company
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Company</span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={createCompany}
          className="text-sm text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-400"
        >
          + New company
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Add Rock (90-day priority)</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Rock title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <input
            type="text"
            placeholder="Quarter"
            value={newQuarter}
            onChange={(e) => setNewQuarter(e.target.value)}
            className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="button"
            onClick={createRock}
            disabled={!newTitle.trim()}
            className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Add Rock
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rocks</h2>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : rocks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No rocks. Add one above.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {rocks.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{r.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.quarter} · {r.status} · {r.progress_pct ?? 0}%</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      r.status === "on_track"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                        : r.status === "at_risk"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                {expandedRock === r.id && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Add milestone (auto-creates task)</p>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Milestone title"
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => addMilestone(r.id)}
                        className="rounded bg-teal-600 px-2 py-1 text-sm text-white hover:bg-teal-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedRock(expandedRock === r.id ? null : r.id)}
                  className="mt-2 text-xs text-teal-600 dark:text-teal-400"
                >
                  {expandedRock === r.id ? "Cancel" : "+ Milestone"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
