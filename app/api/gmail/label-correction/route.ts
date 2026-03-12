/**
 * POST /api/gmail/label-correction — Save a correction when user overrides AI suggestion.
 * Body: { messageId: string, suggestedCategory: string, chosenCategory: string }
 * Fetches message from Gmail to get from/subject/snippet, then stores in label_corrections.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_MESSAGE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { messageId: string; suggestedCategory: string; chosenCategory: string };
  try {
    body = (await req.json()) as { messageId: string; suggestedCategory: string; chosenCategory: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { messageId, suggestedCategory, chosenCategory } = body;
  if (!messageId || !suggestedCategory || !chosenCategory) {
    return NextResponse.json(
      { error: "messageId, suggestedCategory, and chosenCategory are required" },
      { status: 400 }
    );
  }

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Google token missing" }, { status: 400 });
  }

  const res = await fetch(`${GMAIL_MESSAGE_URL}/${messageId}?format=metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Could not fetch message" }, { status: 400 });
  }
  const data = (await res.json()) as {
    snippet?: string;
    payload?: { headers?: Array<{ name: string; value: string }> };
  };
  const headers = (data.payload?.headers ?? []).reduce(
    (acc: Record<string, string>, h: { name: string; value: string }) => {
      acc[h.name.toLowerCase()] = h.value;
      return acc;
    },
    {}
  );

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });

  const { error } = await supabase.from("label_corrections").insert({
    user_id: session.user.id,
    from_header: headers.from ?? null,
    subject: headers.subject ?? null,
    snippet: (data.snippet ?? "").slice(0, 500),
    suggested_category_key: suggestedCategory,
    chosen_category_key: chosenCategory,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
