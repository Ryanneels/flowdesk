/**
 * GET /api/email/processed/[id] — One email by emails_processed.id; includes body from Gmail.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data: row, error } = await supabase
    .from("emails_processed")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await getGoogleAccessToken(session.user.id);
  let bodyPlain: string | null = null;
  if (token && row.gmail_message_id) {
    const res = await fetch(
      `${GMAIL_API}/${row.gmail_message_id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const msg = (await res.json()) as {
        payload?: {
          body?: { data?: string };
          parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
        };
      };
      const payload = msg.payload;
      if (payload?.body?.data) {
        bodyPlain = Buffer.from(payload.body.data, "base64").toString("utf-8");
      } else if (payload?.parts?.[0]?.body?.data) {
        bodyPlain = Buffer.from(payload.parts[0].body!.data!, "base64").toString("utf-8");
      }
    }
  }

  return NextResponse.json({
    ...row,
    body_plain: bodyPlain,
  });
}
