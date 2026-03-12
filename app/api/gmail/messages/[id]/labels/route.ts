/**
 * POST /api/gmail/messages/[id]/labels — Add or remove labels on a message.
 * Body: { addLabelIds?: string[], removeLabelIds?: string[] }
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function POST(
  req: NextRequest,
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
  let body: { addLabelIds?: string[]; removeLabelIds?: string[] };
  try {
    body = (await req.json()) as { addLabelIds?: string[]; removeLabelIds?: string[] };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body; use addLabelIds and/or removeLabelIds" },
      { status: 400 }
    );
  }

  const addLabelIds = body.addLabelIds ?? [];
  const removeLabelIds = body.removeLabelIds ?? [];
  if (addLabelIds.length === 0 && removeLabelIds.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one of addLabelIds or removeLabelIds" },
      { status: 400 }
    );
  }

  const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Gmail API error", details: text },
      { status: res.status }
    );
  }

  const data = (await res.json()) as { id: string; labelIds?: string[] };
  return NextResponse.json({
    ok: true,
    id: data.id,
    labelIds: data.labelIds ?? [],
  });
}
