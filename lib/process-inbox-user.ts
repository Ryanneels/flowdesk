/**
 * Process one user's inbox: suggest label, apply, archive.
 * Used by process-inbox (cron) and gmail/push (live).
 */

import { getGoogleAccessToken } from "@/lib/google-token";
import { suggestLabelForEmail } from "@/lib/gemini";
import type { CannedCategoryKey } from "@/lib/label-categories";
import { createClient } from "@supabase/supabase-js";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type ProcessInboxOptions = {
  /** If set, only process these message IDs (e.g. from history). Otherwise list INBOX. */
  messageIds?: string[];
  /** Max messages to process when listing INBOX (default 10, max 20). */
  maxMessages?: number;
};

export async function processInboxForUser(
  userId: string,
  options: ProcessInboxOptions = {}
): Promise<number> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return 0;

  const token = await getGoogleAccessToken(userId);
  if (!token) return 0;

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const [{ data: userCats }, { data: correctionsRows }] = await Promise.all([
    supabase
      .from("user_label_categories")
      .select("category_key, gmail_label_id, enabled")
      .eq("user_id", userId)
      .eq("enabled", true),
    supabase
      .from("label_corrections")
      .select("from_header, subject, snippet, suggested_category_key, chosen_category_key")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const categories = (userCats ?? []).filter((r) => r.gmail_label_id != null) as Array<{
    category_key: string;
    gmail_label_id: string;
  }>;
  const enabledKeys = categories.map((r) => r.category_key as CannedCategoryKey);
  if (enabledKeys.length === 0) return 0;

  const corrections = (correctionsRows ?? []).map((r) => ({
    from: r.from_header ?? "",
    subject: r.subject ?? "",
    snippet: r.snippet ?? "",
    suggestedCategory: r.suggested_category_key,
    chosenCategory: r.chosen_category_key,
  }));

  let messageIds: string[] = options.messageIds ?? [];
  if (messageIds.length === 0) {
    const max = Math.min(options.maxMessages ?? 10, 20);
    const listRes = await fetch(`${GMAIL_API}/messages?maxResults=${max}&labelIds=INBOX`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) return 0;
    const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
    messageIds = (listData.messages ?? []).map((m) => m.id);
  }

  let processed = 0;
  for (const messageId of messageIds) {
    const metaRes = await fetch(`${GMAIL_API}/messages/${messageId}?format=metadata`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) continue;
    const meta = (await metaRes.json()) as {
      labelIds?: string[];
      snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }> };
    };
    if (options.messageIds && !meta.labelIds?.includes("INBOX")) continue;

    const headers = (meta.payload?.headers ?? []).reduce(
      (acc: Record<string, string>, h: { name: string; value: string }) => {
        acc[h.name.toLowerCase()] = h.value;
        return acc;
      },
      {}
    );
    const from = headers.from ?? "";
    const subject = headers.subject ?? "";
    const snippet = meta.snippet ?? "";

    const suggested = await suggestLabelForEmail({
      from,
      subject,
      snippet,
      enabledCategoryKeys: enabledKeys,
      corrections,
    });
    if (suggested == null) continue;

    const cat = categories.find((c) => c.category_key === suggested);
    const labelId = cat?.gmail_label_id;
    if (!labelId) continue;

    const modifyRes = await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds: [labelId], removeLabelIds: ["INBOX"] }),
    });
    if (modifyRes.ok) processed++;
  }
  return processed;
}
