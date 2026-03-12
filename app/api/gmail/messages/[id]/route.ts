/**
 * GET /api/gmail/messages/[id] — Get a single message (headers + snippet).
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const res = await fetch(`${GMAIL_API}/messages/${id}?format=metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Gmail API error", details: text },
      { status: res.status }
    );
  }

  const data = (await res.json()) as {
    id: string;
    threadId: string;
    snippet?: string;
    labelIds?: string[];
    payload?: {
      headers?: Array<{ name: string; value: string }>;
    };
  };

  const headers = (data.payload?.headers ?? []).reduce(
    (acc: Record<string, string>, h: { name: string; value: string }) => {
      acc[h.name.toLowerCase()] = h.value;
      return acc;
    },
    {}
  );

  return NextResponse.json({
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    labelIds: data.labelIds ?? [],
    subject: headers.subject ?? "",
    from: headers.from ?? "",
    date: headers.date ?? "",
  });
}
