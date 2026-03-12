/**
 * POST /api/gmail/push — Receives Gmail push notifications from Google Pub/Sub.
 * When new mail arrives, Gmail publishes to your topic; Pub/Sub pushes to this URL.
 * We decode the notification (emailAddress, historyId), find the user, fetch new
 * messages from history, and process them (suggest label + archive).
 *
 * Requires: GMAIL_PUBSUB_TOPIC set; Pub/Sub push subscription pointing to this URL.
 */

import { createClient } from "@supabase/supabase-js";
import { getGoogleAccessToken } from "@/lib/google-token";
import { processInboxForUser } from "@/lib/process-inbox-user";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAX_MESSAGES_PER_PUSH = 10;

type PubSubBody = {
  message?: {
    data?: string;
    messageId?: string;
  };
};

type GmailNotification = {
  emailAddress?: string;
  historyId?: string;
};

export async function POST(req: NextRequest) {
  let body: PubSubBody;
  try {
    body = (await req.json()) as PubSubBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body.message?.data;
  if (!raw) {
    return NextResponse.json({ error: "No message data" }, { status: 400 });
  }

  let decoded: GmailNotification;
  try {
    decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as GmailNotification;
  } catch {
    return NextResponse.json({ error: "Invalid message data" }, { status: 400 });
  }

  const emailAddress = decoded.emailAddress;
  const startHistoryId = decoded.historyId;
  if (!emailAddress || !startHistoryId) {
    return NextResponse.json({ error: "Missing emailAddress or historyId" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseSecret, {
    db: { schema: "next_auth" },
    auth: { persistSession: false },
  });
  const { data: userRow, error: userError } = await supabaseAuth
    .from("users")
    .select("id")
    .eq("email", emailAddress)
    .maybeSingle();

  if (userError || !userRow?.id) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const userId = userRow.id as string;
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const historyRes = await fetch(
    `${GMAIL_API}/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded&maxResults=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!historyRes.ok) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const historyData = (await historyRes.json()) as {
    history?: Array<{
      messagesAdded?: Array<{ message?: { id?: string } }>;
    }>;
  };
  const messageIds: string[] = [];
  for (const record of historyData.history ?? []) {
    for (const added of record.messagesAdded ?? []) {
      if (added.message?.id) messageIds.push(added.message.id);
    }
  }
  const toProcess = messageIds.slice(0, MAX_MESSAGES_PER_PUSH);

  const processed = await processInboxForUser(userId, { messageIds: toProcess });
  return NextResponse.json({ ok: true, processed });
}
