"use client";

/**
 * Email GPS + DRIP inbox (Dan Martell "Buy Back Your Time").
 * Default view: @Action-Required only. Other labels collapsed until searched.
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
type Category = {
  key: string;
  name: string;
  description?: string;
  type?: "gps" | "drip";
  enabled: boolean;
  gmail_label_id: string | null;
};

type Suggestion = { gps: string; drip: string };

const ACTION_REQUIRED_KEY = "action-required";

export function GmailPreview() {
  const { data: session, status } = useSession();
  const [labels, setLabels] = useState<Label[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<"action-required" | "all">("action-required");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [suggestedByAi, setSuggestedByAi] = useState<Record<string, Suggestion>>({});
  const [processingInbox, setProcessingInbox] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [watchResult, setWatchResult] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/gmail/labels").then((r) => r.json()),
      fetch("/api/settings/label-categories").then((r) => r.json()),
    ])
      .then(([labelsRes, categoriesRes]) => {
        const cats = (categoriesRes.categories ?? []) as Category[];
        setCategories(cats);
        if (!labelsRes.error) setLabels(labelsRes.labels ?? []);
        const actionId = cats.find((c: Category) => c.key === ACTION_REQUIRED_KEY && c.gmail_label_id)?.gmail_label_id;
        const useActionOnly = viewMode === "action-required" && actionId;
        const labelIds = useActionOnly ? [actionId] : ["INBOX"];
        const params = new URLSearchParams({ maxResults: "20", metadata: "1" });
        labelIds.forEach((id) => params.append("labelIds", id));
        return fetch(`/api/gmail/messages?${params.toString()}`).then((r) => r.json());
      })
      .then((messagesData) => {
        if (messagesData?.error) {
          setError(messagesData.error);
          setMessages([]);
        } else {
          setMessages(messagesData.messages ?? []);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [status, viewMode]);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    loadData();
  }, [status, viewMode, loadData]);

  const handleSuggest = async (messageId: string) => {
    setSuggestingId(messageId);
    setSuggestions((prev) => ({ ...prev, [messageId]: { gps: "", drip: "" } }));
    try {
      const res = await fetch("/api/gmail/suggest-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = (await res.json()) as {
        suggestedGps?: string;
        suggestedDrip?: string;
        suggestedCategory?: string;
        error?: string;
      };
      const gps = data.suggestedGps ?? data.suggestedCategory ?? "";
      const drip = data.suggestedDrip ?? "drip-delegate";
      if (gps) {
        setSuggestedByAi((prev) => ({ ...prev, [messageId]: { gps, drip } }));
        setSuggestions((prev) => ({ ...prev, [messageId]: { gps, drip } }));
      }
    } finally {
      setSuggestingId(null);
    }
  };

  const applyableGps = categories.filter(
    (c) => (c.type === "gps" || !c.type) && c.enabled && c.gmail_label_id != null
  );
  const applyableDrip = categories.filter(
    (c) => c.type === "drip" && c.enabled && c.gmail_label_id != null
  );

  const setSelectedGps = (messageId: string, gpsKey: string) => {
    setSuggestions((prev) => ({
      ...prev,
      [messageId]: { ...(prev[messageId] ?? { gps: "", drip: "drip-delegate" }), gps: gpsKey },
    }));
  };
  const setSelectedDrip = (messageId: string, dripKey: string) => {
    setSuggestions((prev) => ({
      ...prev,
      [messageId]: { ...(prev[messageId] ?? { gps: "", drip: "" }), drip: dripKey },
    }));
  };

  const handleProcessInbox = async () => {
    setProcessingInbox(true);
    setProcessResult(null);
    try {
      const res = await fetch("/api/gmail/process-inbox?maxMessages=10", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; processed?: number; error?: string };
      if (data.ok && typeof data.processed === "number") {
        setProcessResult(`Processed ${data.processed} message(s).`);
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

  const handleApply = async (messageId: string, gpsKey: string, dripKey: string) => {
    const gpsCat = applyableGps.find((c) => c.key === gpsKey);
    const dripCat = applyableDrip.find((c) => c.key === dripKey);
    const gpsLabelId = gpsCat?.gmail_label_id ?? null;
    if (!gpsLabelId) return;
    const addLabelIds: string[] = [gpsLabelId];
    if (dripCat?.gmail_label_id) addLabelIds.push(dripCat.gmail_label_id);
    setApplyingId(messageId);
    try {
      const res = await fetch(`/api/gmail/messages/${messageId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addLabelIds,
          removeLabelIds: ["INBOX"],
        }),
      });
      if (res.ok) {
        const ai = suggestedByAi[messageId];
        if (ai && ai.gps !== gpsKey) {
          await fetch("/api/gmail/label-correction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId,
              suggestedCategory: ai.gps,
              chosenCategory: gpsKey,
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

  if (loading && messages.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gmail</h2>
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gmail</h2>
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{error}</p>
        <p className="mt-2 text-xs text-slate-500">
          Open{" "}
          <a href="/api/debug-gmail-token" target="_blank" rel="noopener noreferrer" className="underline">
            /api/debug-gmail-token
          </a>{" "}
          if token/linking is the issue.
        </p>
      </div>
    );
  }

  const suggestion = (mId: string): Suggestion =>
    suggestions[mId] ?? suggestedByAi[mId] ?? { gps: "", drip: "drip-delegate" };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gmail — Email GPS + DRIP</h2>
      <p className="mt-1 text-sm text-slate-500">
        Default: only @Action-Required. Toggle to see all inbox. Map labels in Settings.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">View:</span>
        <button
          type="button"
          onClick={() => setViewMode("action-required")}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            viewMode === "action-required"
              ? "bg-amber-600 text-white dark:bg-amber-500"
              : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300"
          }`}
        >
          @Action-Required only
        </button>
        <button
          type="button"
          onClick={() => setViewMode("all")}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            viewMode === "all"
              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
              : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300"
          }`}
        >
          All inbox
        </button>
        <button
          type="button"
          onClick={handleProcessInbox}
          disabled={processingInbox}
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-50"
        >
          {processingInbox ? "Processing…" : "Process inbox"}
        </button>
        <button
          type="button"
          onClick={handleTurnOnLive}
          disabled={watching}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600"
        >
          {watching ? "…" : "Turn on live"}
        </button>
        {(processResult || watchResult) && (
          <span className="text-xs text-slate-600 dark:text-slate-400">{processResult ?? watchResult}</span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {viewMode === "action-required" ? "@Action-Required" : "Inbox"} ({messages.length})
        </h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {messages.length === 0 && <li>No messages</li>}
          {messages.map((m) => {
            const s = suggestion(m.id);
            const hasGps = s.gps && applyableGps.some((c) => c.key === s.gps);
            const hasDrip = s.drip && applyableDrip.some((c) => c.key === s.drip);
            const canApply = applyableGps.length > 0 && hasGps;
            return (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded border border-slate-100 p-3 dark:border-slate-700"
              >
                <div className="min-w-0">
                  {m.snippet ? (
                    <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{m.snippet}</p>
                  ) : (
                    <p className="text-sm text-slate-500">{m.subject || `Message ${m.id.slice(0, 8)}…`}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/gmail/messages/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 underline"
                  >
                    {m.id.slice(0, 8)}…
                  </a>
                  {!s.gps ? (
                    <button
                      type="button"
                      onClick={() => handleSuggest(m.id)}
                      disabled={!!suggestingId}
                      className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 disabled:opacity-50"
                    >
                      {suggestingId === m.id ? "…" : "Suggest GPS + DRIP"}
                    </button>
                  ) : (
                    <>
                      <select
                        value={s.gps}
                        onChange={(e) => setSelectedGps(m.id, e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {applyableGps.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {applyableDrip.length > 0 && (
                        <select
                          value={s.drip}
                          onChange={(e) => setSelectedDrip(m.id, e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {applyableDrip.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {canApply ? (
                        <button
                          type="button"
                          onClick={() => handleApply(m.id, s.gps, s.drip)}
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
  );
}
