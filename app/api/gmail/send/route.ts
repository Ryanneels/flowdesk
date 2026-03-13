/**
 * POST /api/gmail/send
 * Sends a reply email via Gmail API and marks the email as responded in Supabase.
 *
 * Body: { emailId: string (emails_processed.id), body: string, subject?: string }
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

type GmailMessageHeader = { name: string; value: string };
type GmailMessage = {
  threadId?: string;
  payload?: { headers?: GmailMessageHeader[] };
};

function getHeader(headers: GmailMessageHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Encode a string as base64url (URL-safe base64, no padding). */
function toBase64Url(s: string): string {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build an RFC 2822 reply message. */
function buildReplyRaw(opts: {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo: string;
  references: string;
  threadId: string;
}): string {
  const replySubject = opts.subject.startsWith("Re:") ? opts.subject : `Re: ${opts.subject}`;
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${replySubject}`,
    `In-Reply-To: ${opts.inReplyTo}`,
    `References: ${opts.references}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    opts.body,
  ];
  return toBase64Url(lines.join("\r\n"));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    emailId?: string;
    body?: string;
    subject?: string;
  };

  if (!body.emailId || !body.body?.trim()) {
    return NextResponse.json({ error: "emailId and body are required" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });

  // Load the emails_processed row
  const { data: emailRow, error: emailError } = await supabase
    .from("emails_processed")
    .select("gmail_message_id, subject, sender_email, sender_name")
    .eq("id", body.emailId)
    .eq("user_id", session.user.id)
    .single();

  if (emailError || !emailRow) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "No Google token available" }, { status: 400 });
  }

  // Fetch the original Gmail message to get thread ID and Message-ID header
  const msgRes = await fetch(
    `${GMAIL_API}/messages/${emailRow.gmail_message_id}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=From&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!msgRes.ok) {
    const text = await msgRes.text();
    return NextResponse.json({ error: "Failed to fetch original message", details: text }, { status: 502 });
  }
  const originalMsg = (await msgRes.json()) as GmailMessage;
  const headers = originalMsg.payload?.headers ?? [];

  const threadId = originalMsg.threadId ?? "";
  const messageId = getHeader(headers, "Message-ID");
  const references = getHeader(headers, "References");
  const originalFrom = getHeader(headers, "From") || emailRow.sender_email || "";
  const subject = body.subject || emailRow.subject || "";

  // Get the user's email address to use as "From"
  const profileRes = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = profileRes.ok
    ? ((await profileRes.json()) as { emailAddress?: string })
    : { emailAddress: session.user.email ?? "" };
  const senderAddress = profile.emailAddress || session.user.email || "";

  // Build and send the reply
  const rawMessage = buildReplyRaw({
    to: originalFrom,
    from: senderAddress,
    subject,
    body: body.body,
    inReplyTo: messageId,
    references: references ? `${references} ${messageId}` : messageId,
    threadId,
  });

  const sendRes = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawMessage, threadId }),
  });

  if (!sendRes.ok) {
    const text = await sendRes.text();
    return NextResponse.json({ error: "Gmail send failed", details: text }, { status: 502 });
  }

  // Mark as responded in Supabase
  await supabase
    .from("emails_processed")
    .update({
      user_replied: true,
      gps_label: "responded",
    })
    .eq("id", body.emailId)
    .eq("user_id", session.user.id);

  return NextResponse.json({ ok: true });
}
