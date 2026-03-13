/**
 * Process one user's inbox: suggest Email GPS + DRIP, apply both labels, archive.
 * Used by process-inbox (cron) and gmail/push (live).
 */

import { getGoogleAccessToken } from "@/lib/google-token";
import { suggestLabelForEmail } from "@/lib/gemini";
import { GPS_KEYS, DRIP_KEYS, type GpsCategoryKey, type DripCategoryKey } from "@/lib/label-categories";
import { createClient } from "@supabase/supabase-js";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type ProcessInboxOptions = {
  messageIds?: string[];
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

  const labelMap = (userCats ?? [])
    .filter((r) => r.gmail_label_id != null)
    .reduce((acc, r) => {
      acc[r.category_key] = r.gmail_label_id!;
      return acc;
    }, {} as Record<string, string>);

  const enabledGpsKeys = GPS_KEYS.filter((k) => labelMap[k]) as GpsCategoryKey[];
  const enabledDripKeys = DRIP_KEYS.filter((k) => labelMap[k]) as DripCategoryKey[];
  if (enabledGpsKeys.length === 0) return 0;

  const corrections = (correctionsRows ?? []).map((r) => ({
    from: r.from_header ?? "",
    subject: r.subject ?? "",
    snippet: r.snippet ?? "",
    suggestedCategory: r.suggested_category_key ?? "",
    chosenCategory: r.chosen_category_key ?? "",
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

    const result = await suggestLabelForEmail({
      from,
      subject,
      snippet,
      enabledGpsKeys,
      enabledDripKeys: enabledDripKeys.length > 0 ? enabledDripKeys : (DRIP_KEYS as DripCategoryKey[]),
      corrections,
    });
    if (!result) continue;

    const gpsLabelId = labelMap[result.gps];
    if (!gpsLabelId) continue;

    const addLabelIds: string[] = [gpsLabelId];
    if (labelMap[result.drip]) addLabelIds.push(labelMap[result.drip]);

    const modifyRes = await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds, removeLabelIds: ["INBOX"] }),
    });
    if (modifyRes.ok) processed++;
  }
  return processed;
}
