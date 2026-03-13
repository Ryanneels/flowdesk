/**
 * POST /api/email/process
 * Fetches new Gmail messages, classifies each with Claude (Email GPS + DRIP Matrix),
 * generates AI draft replies, and saves everything to emails_processed.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { classifyAndDraftEmail } from "@/lib/claude";
import {
  GPS_KEYS,
  DRIP_KEYS,
  type GpsCategoryKey,
  type DripCategoryKey,
} from "@/lib/label-categories";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// ── MIME body extractor ────────────────────────────────────────────────────────

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

function decodeBase64Url(s: string): string {
  try {
    const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractPlainText(part: GmailPart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const p of part.parts) {
      const text = extractPlainText(p);
      if (text) return text;
    }
  }
  return "";
}

function extractHtmlText(part: GmailPart): string {
  if (part.mimeType === "text/html" && part.body?.data) {
    const html = decodeBase64Url(part.body.data);
    // Strip HTML tags for a rough plain-text version
    return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  if (part.parts) {
    for (const p of part.parts) {
      const text = extractHtmlText(p);
      if (text) return text;
    }
  }
  return "";
}

// ── Main route ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) {
    return NextResponse.json(
      { error: "No Google account linked or token missing" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const maxMessages = Math.min(Number(searchParams.get("maxMessages")) || 20, 50);

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });

  // Fetch inbox message IDs
  const listRes = await fetch(
    `${GMAIL_API}/messages?maxResults=${maxMessages}&labelIds=INBOX`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) {
    const text = await listRes.text();
    return NextResponse.json({ error: "Gmail list failed", details: text }, { status: listRes.status });
  }
  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
  const messageIds = (listData.messages ?? []).map((m) => m.id);
  if (messageIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No messages in INBOX" });
  }

  // Skip already-processed messages
  const { data: existing } = await supabase
    .from("emails_processed")
    .select("gmail_message_id")
    .eq("user_id", session.user.id)
    .in("gmail_message_id", messageIds);
  const alreadyProcessed = new Set((existing ?? []).map((r) => r.gmail_message_id));
  const toProcess = messageIds.filter((id) => !alreadyProcessed.has(id));
  if (toProcess.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: "All messages already in emails_processed",
    });
  }

  // Load recent user label corrections for Claude to learn from
  const { data: correctionsRows } = await supabase
    .from("label_corrections")
    .select("from_header, subject, snippet, suggested_category_key, chosen_category_key")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(15);
  const corrections = (correctionsRows ?? []).map((r) => ({
    from: r.from_header ?? "",
    subject: r.subject ?? "",
    snippet: r.snippet ?? "",
    suggestedCategory: r.suggested_category_key ?? "",
    chosenCategory: r.chosen_category_key ?? "",
  }));

  let processed = 0;

  for (const messageId of toProcess) {
    // Fetch full message (not just metadata) to get the body
    const msgRes = await fetch(
      `${GMAIL_API}/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!msgRes.ok) continue;

    const msg = (await msgRes.json()) as {
      internalDate?: string;
      snippet?: string;
      threadId?: string;
      payload?: GmailPart & { headers?: Array<{ name: string; value: string }> };
    };

    const headers = (msg.payload?.headers ?? []).reduce(
      (acc: Record<string, string>, h) => {
        acc[h.name.toLowerCase()] = h.value;
        return acc;
      },
      {}
    );

    const from = headers.from ?? "";
    const subject = headers.subject ?? "";
    const receivedAt = msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : null;
    const senderEmail = from.replace(/^.*<([^>]+)>$/, "$1").trim() || from;
    const senderName = from.replace(/\s*<[^>]+>\s*$/, "").trim() || null;

    // Extract body text (prefer plain text, fall back to stripped HTML)
    const bodyText =
      (msg.payload ? extractPlainText(msg.payload) : "") ||
      (msg.payload ? extractHtmlText(msg.payload) : "") ||
      msg.snippet ||
      "";

    // Classify and draft with Claude
    const result = await classifyAndDraftEmail({
      from,
      subject,
      body: bodyText,
      enabledGpsKeys: GPS_KEYS as GpsCategoryKey[],
      enabledDripKeys: DRIP_KEYS as DripCategoryKey[],
      corrections,
    });
    if (!result) continue;

    const { error } = await supabase.from("emails_processed").insert({
      user_id: session.user.id,
      gmail_message_id: messageId,
      subject: subject || null,
      sender_email: senderEmail || null,
      sender_name: senderName,
      received_at: receivedAt,
      gps_label: result.gps,
      drip_label: result.drip.replace("drip-", ""),
      confidence_score: 85,
      summary: result.summary,
      ai_draft: result.draftReply,
    });
    if (!error) processed++;
  }

  return NextResponse.json({
    ok: true,
    processed,
    total_in_inbox: messageIds.length,
    already_in_db: messageIds.length - toProcess.length,
  });
}
