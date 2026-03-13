"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Company = { id: string; name: string };
type Project = { id: string; company_id: string; name: string; description: string | null; status: string };

export default function ProjectsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const loadCompanies = useCallback(async () => {
    const res = await fetch("/api/os/companies");
    const d = (await res.json()) as { companies?: Company[] };
    const list = d.companies ?? [];
    setCompanies(list);
    if (list.length && !companyId) setCompanyId(list[0].id);
  }, [companyId]);

  const loadProjects = useCallback(async () => {
    if (!companyId) return;
    const res = await fetch(`/api/projects?company_id=${companyId}`);
    const d = (await res.json()) as { projects?: Project[] };
    setProjects(d.projects ?? []);
  }, [companyId]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    loadProjects().finally(() => setLoading(false));
  }, [companyId, loadProjects]);

  const createProject = async () => {
    if (!newName.trim() || !companyId) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      loadProjects();
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Projects</h1>
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
        <input
          type="text"
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={createProject}
          disabled={!newName.trim()}
          className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
        >
          Add project
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-500">No projects. Create a company first (Company OS), then add a project.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-purple-800"
              >
                <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.status}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
