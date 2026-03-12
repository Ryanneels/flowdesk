"use client";

/**
 * Phase 4 + 5 — Gmail labels, recent inbox, and AI suggest label + apply.
 */

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Label = { id: string; name: string; type: string };
type Message = {
  id: string;
  threadId: string;
  snippet?: string | null;
  subject?: string | null;
  from?: string | null;
};
type Category = { key: string; name: string; enabled: boolean; gmail_label_id: string | null };

export function GmailPreview() {
  const { data: session, status } = useSession();
  const [labels, setLabels] = useState<Label[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [suggestedByAi, setSuggestedByAi] = useState<Record<string, string>>({});
  const [processingInbox, setProcessingInbox] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [watchResult, setWatchResult] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (status !== "authenticated" || !session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/gmail/labels").then((r) => r.json()),
      fetch("/api/gmail/messages?maxResults=5&metadata=1").then((r) => r.json()),
      fetch("/api/settings/label-categories").then((r) => r.json()),
    ])
      .then(([labelsRes, messagesRes, categoriesRes]) => {
        if (cancelled) return;
        const detailMsg = (d: unknown) => {
          if (d == null) return "";
          if (typeof d === "string") return d.slice(0, 300);
          if (typeof d === "object" && d !== null && "error" in d) {
            const err = (d as { error?: { message?: string } }).error;
            return err?.message ?? JSON.stringify(d).slice(0, 300);
          }
          return String(d).slice(0, 300);
        };
        if (labelsRes.error) {
          setError(`${labelsRes.error} — ${detailMsg(labelsRes.details)}`.trim());
          setLabels([]);
        } else {
          setLabels(labelsRes.labels ?? []);
        }
        if (messagesRes.error && !labelsRes.error) {
          setError(`${messagesRes.error} — ${detailMsg(messagesRes.details)}`.trim());
          setMessages([]);
        } else {
          setMessages(messagesRes.messages ?? []);
        }
        setCategories((categoriesRes.categories ?? []) as Category[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      setLoading(false);
      return;
    }
    const cleanup = loadData();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [status, session, loadData]);

  const handleSuggest = async (messageId: string) => {
    setSuggestingId(messageId);
    setSuggestions((prev) => ({ ...prev, [messageId]: "" }));
    try {
      const res = await fetch("/api/gmail/suggest-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = (await res.json()) as { suggestedCategory?: string; error?: string };
      if (data.suggestedCategory) {
        const key = data.suggestedCategory;
        setSuggestedByAi((prev) => ({ ...prev, [messageId]: key }));
        setSuggestions((prev) => ({ ...prev, [messageId]: key }));
      }
    } finally {
      setSuggestingId(null);
    }
  };

  const applyableCategories = categories.filter((c) => c.enabled && c.gmail_label_id != null);

  const setSelectedCategory = (messageId: string, categoryKey: string) => {
    setSuggestions((prev) => ({ ...prev, [messageId]: categoryKey }));
  };

  const handleProcessInbox = async () => {
    setProcessingInbox(true);
    setProcessResult(null);
    try {
      const res = await fetch("/api/gmail/process-inbox?maxMessages=10", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; processed?: number; error?: string };
      if (data.ok && typeof data.processed === "number") {
        setProcessResult(`Processed ${data.processed} message(s). Inbox updated.`);
        loadData();
      } else {
        setProcessResult(data.error ?? "Failed to process inbox");
      }
    } finally {
      setProcessingInbox(false);
    }
  };

  const handleTurnOnLive = async () => {
    setWatching(true);
    setWatchResult(null);
    try {
      const res = await fetch("/api/gmail/watch", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (data.ok) {
        setWatchResult(data.message ?? "Live processing is on.");
      } else {
        setWatchResult(data.error ?? "Could not turn on live.");
      }
    } finally {
      setWatching(false);
    }
  };

  const handleApply = async (messageId: string, categoryKey: string) => {
    const cat = categories.find((c) => c.key === categoryKey);
    const labelId = cat?.gmail_label_id ?? null;
    if (!labelId) return;
    setApplyingId(messageId);
    try {
      const res = await fetch(`/api/gmail/messages/${messageId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addLabelIds: [labelId],
          removeLabelIds: ["INBOX"],
        }),
      });
      if (res.ok) {
        const aiSuggested = suggestedByAi[messageId];
        if (aiSuggested && aiSuggested !== categoryKey) {
          await fetch("/api/gmail/label-correction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId,
              suggestedCategory: aiSuggested,
              chosenCategory: categoryKey,
            }),
          });
        }
        setSuggestions((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        setSuggestedByAi((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    } finally {
      setApplyingId(null);
    }
  };

  if (status !== "authenticated" || !session) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gmail</h2>
        <p className="mt-2 text-sm text-slate-500">Loading labels and messages…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gmail</h2>
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{error}</p>
        <p className="mt-2 text-xs text-slate-500">
          If it says &quot;has not been used&quot; or &quot;Access Not Configured&quot;, enable <strong>Gmail API</strong> in{" "}
          <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console → APIs &amp; Services → Library</a> for your project.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gmail</h2>
      <p className="mt-1 text-sm text-slate-500">Labels, recent inbox, and AI suggest label. Use live (push) or scheduled (cron).</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleTurnOnLive}
          disabled={watching}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
        >
          {watching ? "…" : "Turn on live"}
        </button>
        <button
          type="button"
          onClick={handleProcessInbox}
          disabled={processingInbox}
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          {processingInbox ? "Processing…" : "Process inbox now"}
        </button>
        {(processResult || watchResult) && (
          <span className="text-xs text-slate-600 dark:text-slate-400">{processResult ?? watchResult}</span>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Labels ({labels.length})</h3>
          <ul className="mt-2 max-h-32 overflow-y-auto text-sm text-slate-600 dark:text-slate-400">
            {labels.slice(0, 12).map((l) => (
              <li key={l.id} className="truncate">
                {l.name}
              </li>
            ))}
            {labels.length > 12 && <li className="text-slate-400">… and {labels.length - 12} more</li>}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Recent inbox ({messages.length})</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {messages.length === 0 && <li>No messages</li>}
            {messages.map((m) => {
              const suggested = suggestions[m.id];
              const effectiveKey =
                suggested && applyableCategories.some((c) => c.key === suggested)
                  ? suggested
                  : applyableCategories[0]?.key ?? "";
              const canApply = applyableCategories.length > 0 && effectiveKey;
              return (
                <li key={m.id} className="flex flex-col gap-1.5 rounded border border-slate-100 p-2 dark:border-slate-700">
                  <div className="min-w-0">
                    {m.snippet != null && m.snippet !== "" ? (
                      <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300" title={m.snippet}>
                        {m.snippet}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {m.subject || `Message ${m.id.slice(0, 8)}…`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`/api/gmail/messages/${m.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-400">
                      {m.id.slice(0, 8)}…
                    </a>
                    {!suggested ? (
                      <button
                        type="button"
                        onClick={() => handleSuggest(m.id)}
                        disabled={!!suggestingId}
                        className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                      >
                        {suggestingId === m.id ? "…" : "Suggest label"}
                      </button>
                    ) : (
                      <>
                        <select
                          value={effectiveKey}
                          onChange={(e) => setSelectedCategory(m.id, e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {applyableCategories.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {canApply ? (
                          <button
                            type="button"
                            onClick={() => handleApply(m.id, effectiveKey)}
                            disabled={!!applyingId}
                            className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {applyingId === m.id ? "…" : "Apply"}
                          </button>
                        ) : (
                          <a href="/settings/labels" className="text-xs text-amber-600 dark:text-amber-400">
                            Map in Settings
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
