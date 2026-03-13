"use client";

/**
 * Phase 5 — Choose which canned label categories to use and map each to a Gmail label.
 */

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Category = {
  key: string;
  name: string;
  description: string;
  type?: "gps" | "drip";
  enabled: boolean;
  gmail_label_id: string | null;
};

type GmailLabel = { id: string; name: string; type: string };

export default function SettingsLabelsPage() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/label-categories");
    if (!res.ok) return;
    const data = (await res.json()) as { categories: Category[]; gmailLabels: GmailLabel[] };
    setCategories(data.categories ?? []);
    setGmailLabels(data.gmailLabels ?? []);
  }, []);

  useEffect(() => {
    if (status === "authenticated") load().finally(() => setLoading(false));
  }, [status, load]);

  const setEnabled = (key: string, enabled: boolean) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, enabled } : c)));
  };

  const setGmailLabelId = (key: string, gmail_label_id: string | null) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, gmail_label_id } : c)));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/label-categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        categories.map((c) => ({
          category_key: c.key,
          enabled: c.enabled,
          gmail_label_id: c.gmail_label_id || null,
        }))
      ),
    });
    setSaving(false);
    if (res.ok) setMessage("Saved.");
    else setMessage("Failed to save.");
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="mx-auto max-w-2xl">
          {status === "unauthenticated" ? (
            <p className="text-slate-600 dark:text-slate-400">
              <Link href="/" className="underline">Sign in</Link> to configure label categories.
            </p>
          ) : (
            <p className="text-slate-500">Loading…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-6">
          <Link href="/" className="text-slate-600 dark:text-slate-400 hover:underline">
            ← Back to FlowDesk
          </Link>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email GPS + DRIP labels</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Map each Email GPS and DRIP category to a Gmail label. Create labels in Gmail first (e.g. &quot;@Action-Required&quot;, &quot;DRIP:Produce&quot;).
        </p>

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <div className="mt-6 space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Email GPS (one per email)</h2>
              <p className="mt-1 text-sm text-slate-500">Primary folder: where the email goes.</p>
              <div className="mt-3 space-y-4">
            {categories.filter((c) => c.type === "gps" || !c.type).map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="flex items-start gap-4">
                  <label className="flex shrink-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) => setEnabled(c.key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{c.description}</p>
                    <div className="mt-2">
                      <label className="text-xs text-slate-500">Map to Gmail label</label>
                      <select
                        value={c.gmail_label_id ?? ""}
                        onChange={(e) => setGmailLabelId(c.key, e.target.value || null)}
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">— Create or choose later —</option>
                        {gmailLabels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">DRIP Matrix (layer on top)</h2>
              <p className="mt-1 text-sm text-slate-500">Value/energy tag: Delegate, Replace, Invest, Produce.</p>
              <div className="mt-3 space-y-4">
            {categories.filter((c) => c.type === "drip").map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="flex items-start gap-4">
                  <label className="flex shrink-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) => setEnabled(c.key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{c.description}</p>
                    <div className="mt-2">
                      <label className="text-xs text-slate-500">Map to Gmail label</label>
                      <select
                        value={c.gmail_label_id ?? ""}
                        onChange={(e) => setGmailLabelId(c.key, e.target.value || null)}
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">— Create or choose later —</option>
                        {gmailLabels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </section>
            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {message && (
                <span className={`text-sm ${message.startsWith("Saved") ? "text-green-600" : "text-amber-600"}`}>
                  {message}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
