/**
 * GET /api/gmail/messages — List messages (e.g. from INBOX).
 * Query: maxResults (default 10), labelIds (comma-separated, e.g. INBOX).
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const maxResults = Math.min(Number(searchParams.get("maxResults")) || 10, 50);
  const labelIdsParam = searchParams.get("labelIds");
  const labelIds = labelIdsParam ? labelIdsParam.split(",").map((s) => s.trim()) : ["INBOX"];
  const includeMetadata = searchParams.get("metadata") === "1";

  const url = new URL(`${GMAIL_API}/messages`);
  url.searchParams.set("maxResults", String(maxResults));
  labelIds.forEach((id) => url.searchParams.append("labelIds", id));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    let details: string | object = text;
    try {
      details = JSON.parse(text) as object;
    } catch {
      // keep as string
    }
    return NextResponse.json(
      { error: "Gmail API error", details },
      { status: res.status }
    );
  }

  const data = (await res.json()) as { messages?: Array<{ id: string; threadId: string }> };
  let messages = data.messages ?? [];

  if (includeMetadata && messages.length > 0) {
    const withMeta = await Promise.all(
      messages.map(async (m) => {
        const r = await fetch(`${GMAIL_API}/messages/${m.id}?format=metadata`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return { ...m, snippet: null, subject: null, from: null };
        const msg = (await r.json()) as {
          snippet?: string;
          payload?: { headers?: Array<{ name: string; value: string }> };
        };
        const headers = (msg.payload?.headers ?? []).reduce(
          (acc: Record<string, string>, h: { name: string; value: string }) => {
            acc[h.name.toLowerCase()] = h.value;
            return acc;
          },
          {}
        );
        return {
          ...m,
          snippet: msg.snippet ?? null,
          subject: headers.subject ?? null,
          from: headers.from ?? null,
        };
      })
    );
    messages = withMeta;
  }

  return NextResponse.json({ messages });
}
