/**
 * POST /api/gmail/suggest-label — Suggest Email GPS + DRIP for an email.
 * Body: { messageId: string } or { from, subject, snippet }.
 * Returns: { suggestedGps, suggestedDrip } and legacy suggestedCategory (same as suggestedGps).
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { suggestLabelForEmail } from "@/lib/gemini";
import { GPS_KEYS, DRIP_KEYS, type GpsCategoryKey, type DripCategoryKey } from "@/lib/label-categories";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_MESSAGE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { messageId?: string; from?: string; subject?: string; snippet?: string };
  try {
    body = (await req.json()) as { messageId?: string; from?: string; subject?: string; snippet?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const [{ data: userCats }, { data: correctionsRows }] = await Promise.all([
    supabase
      .from("user_label_categories")
      .select("category_key, enabled, gmail_label_id")
      .eq("user_id", session.user.id)
      .eq("enabled", true),
    supabase
      .from("label_corrections")
      .select("from_header, subject, snippet, suggested_category_key, chosen_category_key")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const enabledKeys = (userCats ?? [])
    .filter((r) => r.gmail_label_id != null)
    .map((r) => r.category_key as string);
  const enabledGpsKeys = GPS_KEYS.filter((k) => enabledKeys.includes(k)) as GpsCategoryKey[];
  const enabledDripKeys = DRIP_KEYS.filter((k) => enabledKeys.includes(k)) as DripCategoryKey[];
  if (enabledGpsKeys.length === 0) {
    return NextResponse.json(
      { error: "No Email GPS labels enabled and mapped. Configure at least one in Settings → Labels." },
      { status: 400 }
    );
  }

  const corrections = (correctionsRows ?? []).map((r) => ({
    from: r.from_header ?? "",
    subject: r.subject ?? "",
    snippet: r.snippet ?? "",
    suggestedCategory: r.suggested_category_key ?? "",
    chosenCategory: r.chosen_category_key ?? "",
  }));

  let from = body.from ?? "";
  let subject = body.subject ?? "";
  let snippet = body.snippet ?? "";

  if (body.messageId && (!from || !snippet)) {
    const token = await getGoogleAccessToken(session.user.id);
    if (!token) {
      return NextResponse.json({ error: "Google token missing" }, { status: 400 });
    }
    const res = await fetch(`${GMAIL_MESSAGE_URL}/${body.messageId}?format=metadata`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Gmail API error", details: text }, { status: res.status });
    }
    const data = (await res.json()) as {
      snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }> };
    };
    snippet = data.snippet ?? "";
    const headers = (data.payload?.headers ?? []).reduce(
      (acc: Record<string, string>, h: { name: string; value: string }) => {
        acc[h.name.toLowerCase()] = h.value;
        return acc;
      },
      {}
    );
    from = headers.from ?? "";
    subject = headers.subject ?? "";
  }

  if (!from && !subject && !snippet) {
    return NextResponse.json({ error: "Provide messageId or from, subject, snippet" }, { status: 400 });
  }

  const result = await suggestLabelForEmail({
    from,
    subject,
    snippet,
    enabledGpsKeys,
    enabledDripKeys: enabledDripKeys.length > 0 ? enabledDripKeys : (DRIP_KEYS as DripCategoryKey[]),
    corrections,
  });

  if (!result) {
    return NextResponse.json({ error: "Label suggestion failed. Check GEMINI_API_KEY." }, { status: 502 });
  }

  return NextResponse.json({
    suggestedGps: result.gps,
    suggestedDrip: result.drip,
    suggestedCategory: result.gps,
  });
}
