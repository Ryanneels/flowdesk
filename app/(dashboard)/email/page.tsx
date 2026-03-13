"use client";

import { useCallback, useEffect, useState } from "react";

const GPS_LABELS = [
  { key: "action-required", label: "Action Required" },
  { key: "to-respond", label: "To Respond" },
  { key: "responded", label: "Responded" },
  { key: "waiting-on", label: "Waiting On" },
  { key: "financials", label: "Financials" },
  { key: "newsletters", label: "Newsletters" },
  { key: "fyi", label: "FYI" },
] as const;

type ProcessedEmail = {
  id: string;
  gmail_message_id: string;
  subject: string | null;
  sender_email: string | null;
  sender_name: string | null;
  received_at: string | null;
  gps_label: string | null;
  drip_label: string | null;
  confidence_score: number | null;
  summary: string | null;
  ai_draft: string | null;
  user_replied: boolean | null;
  waiting_on_since: string | null;
  processed_at: string | null;
};

type EmailDetail = ProcessedEmail & { body_plain?: string | null };

const DRIP_COLORS: Record<string, string> = {
  produce: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  replace: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  invest: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  delegate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Process Inbox Button ───────────────────────────────────────────────────────

function ProcessInboxButton({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/process", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; processed?: number; error?: string };
      if (data.ok) setResult(`✓ Processed ${data.processed ?? 0} new`);
      else setResult(data.error ?? "Failed");
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="w-full rounded-lg bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "Classifying…" : "Process Inbox"}
      </button>
      {result && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{result}</p>}
    </div>
  );
}

// ── Draft Panel ────────────────────────────────────────────────────────────────

function DraftPanel({
  email,
  onSent,
}: {
  email: EmailDetail;
  onSent: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(email.ai_draft ?? "");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  // Reset when email changes
  useEffect(() => {
    setDraft(email.ai_draft ?? "");
    setEditing(false);
    setSentMsg(null);
  }, [email.id, email.ai_draft]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id, body: draft }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setSentMsg("Sent!");
        onSent();
      } else {
        setSentMsg(`Error: ${data.error ?? "Unknown error"}`);
      }
    } finally {
      setSending(false);
    }
  };

  if (sentMsg === "Sent!") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Email sent</p>
      </div>
    );
  }

  return (
    <div className="flex w-1/2 flex-col overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
      <div className="flex items-center justify-between border-b border-amber-200 px-3 py-2 dark:border-amber-800">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">AI Draft</p>
        {email.summary && (
          <p className="max-w-[60%] truncate text-xs text-slate-500 dark:text-slate-400">
            {email.summary}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {!email.ai_draft && !editing ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              No AI draft — add your Anthropic API key and re-process to generate drafts.
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Write manually
            </button>
          </div>
        ) : editing ? (
          <textarea
            className="h-full w-full resize-none bg-transparent p-3 text-sm text-slate-700 outline-none dark:text-slate-300"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your reply…"
          />
        ) : (
          <div className="h-full overflow-y-auto p-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {draft}
            </p>
          </div>
        )}
      </div>

      {sentMsg && sentMsg !== "Sent!" && (
        <p className="px-3 py-1 text-xs text-red-600 dark:text-red-400">{sentMsg}</p>
      )}

      <div className="flex gap-2 border-t border-amber-200 p-2 dark:border-amber-800">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {editing ? "Preview" : "Edit"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(email.ai_draft ?? "");
              setEditing(false);
            }}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EmailPage() {
  const [gpsFilter, setGpsFilter] = useState<string>("action-required");
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    const [listRes, allRes] = await Promise.all([
      fetch(`/api/email/processed?gps_label=${gpsFilter}&limit=50`),
      fetch("/api/email/processed?limit=200"),
    ]);
    const listData = (await listRes.json()) as { emails?: ProcessedEmail[] };
    const allData = (await allRes.json()) as { emails?: ProcessedEmail[] };
    setEmails(listData.emails ?? []);
    const counts: Record<string, number> = {};
    (allData.emails ?? []).forEach((e) => {
      const g = e.gps_label ?? "other";
      counts[g] = (counts[g] ?? 0) + 1;
    });
    setStats(counts);
    setLoading(false);
  }, [gpsFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedEmail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/email/processed/${selectedId}`)
      .then((r) => r.json())
      .then((data) => setSelectedEmail(data as EmailDetail))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const handleSent = useCallback(() => {
    // Refresh list and clear selection after sending
    loadList();
    setSelectedId(null);
  }, [loadList]);

  const waitingOnCount = stats["waiting-on"] ?? 0;

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* ── Left sidebar: filters + stats ── */}
      <div className="flex w-52 shrink-0 flex-col gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Email</h1>

        <div className="space-y-0.5">
          {GPS_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setGpsFilter(key)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                gpsFilter === key
                  ? "bg-amber-100 font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <span>{label}</span>
              {(stats[key] ?? 0) > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                  {stats[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {stats["action-required"] ?? 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Need your attention</p>
          {waitingOnCount > 0 && (
            <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              ⏳ {waitingOnCount} waiting on reply
            </p>
          )}
        </div>

        <ProcessInboxButton onDone={loadList} />
      </div>

      {/* ── Main panel: email list + detail ── */}
      <div className="flex min-w-0 flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">

        {/* Email list */}
        <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 dark:border-slate-700">
          <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {GPS_LABELS.find((g) => g.key === gpsFilter)?.label ?? gpsFilter}
              <span className="ml-1.5 text-slate-400">({emails.length})</span>
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            ) : emails.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                No emails here. Try processing your inbox or changing the filter.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {emails.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full px-3 py-3 text-left ${
                        selectedId === e.id
                          ? "bg-amber-50 dark:bg-amber-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {e.sender_name || e.sender_email || "—"}
                        </p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatTime(e.received_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                        {e.subject || "(no subject)"}
                      </p>
                      {e.summary && (
                        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                          {e.summary}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {e.drip_label && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              DRIP_COLORS[e.drip_label] ??
                              "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                            }`}
                          >
                            {e.drip_label}
                          </span>
                        )}
                        {e.ai_draft && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            draft ready
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Email detail + draft */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center text-slate-400 dark:text-slate-500">
              Select an email to view
            </div>
          ) : loadingDetail ? (
            <div className="flex flex-1 items-center justify-center text-slate-500">
              Loading…
            </div>
          ) : selectedEmail ? (
            <div className="flex flex-1 overflow-hidden gap-4 p-4">
              {/* Left: email body */}
              <div className="flex w-1/2 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedEmail.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    From: {selectedEmail.sender_name
                      ? `${selectedEmail.sender_name} <${selectedEmail.sender_email}>`
                      : selectedEmail.sender_email || "—"}
                  </p>
                  {selectedEmail.received_at && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(selectedEmail.received_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedEmail.body_plain || "(no body)"}
                </div>
              </div>

              {/* Right: AI draft panel */}
              <DraftPanel email={selectedEmail} onSent={handleSent} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
