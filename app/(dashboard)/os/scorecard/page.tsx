"use client";

import { useCallback, useEffect, useState } from "react";

type Company = { id: string; name: string };
type Metric = {
  id: string;
  name: string;
  goal_value: number | null;
  goal_unit: string | null;
  entries: { week_of: string; actual_value: number | null; is_on_track: boolean | null }[];
};

export default function ScorecardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

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
    const res = await fetch(`/api/os/scorecard?company_id=${companyId}`);
    const data = (await res.json()) as { metrics?: Metric[] };
    setMetrics(data.metrics ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (companyId) load();
  }, [companyId, load]);

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
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : metrics.length === 0 ? (
        <p className="text-sm text-slate-500">No metrics. Create one via API or add UI.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Metric</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Goal</th>
                {Array.from({ length: 13 }, (_, i) => (
                  <th key={i} className="px-2 py-2 text-center font-medium text-slate-600 dark:text-slate-400">W{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{m.name}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                    {m.goal_value != null ? `${m.goal_value} ${m.goal_unit ?? ""}` : "—"}
                  </td>
                  {(m.entries ?? []).slice(0, 13).map((e, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      <span
                        className={
                          e.is_on_track === false
                            ? "text-red-600 dark:text-red-400"
                            : e.is_on_track === true
                              ? "text-green-600 dark:text-green-400"
                              : "text-slate-500"
                        }
                      >
                        {e.actual_value ?? "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
