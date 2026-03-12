/**
 * GET /api/gmail/labels — List the user's Gmail labels.
 * Requires the user to be signed in.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function GET() {
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

  const res = await fetch(`${GMAIL_API}/labels`, {
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

  const data = (await res.json()) as { labels?: Array<{ id: string; name: string; type: string }> };
  return NextResponse.json({ labels: data.labels ?? [] });
}
