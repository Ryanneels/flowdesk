/**
 * GET  — list canned categories, user's saved mapping, and their Gmail labels.
 * PUT  — save which categories are enabled and which Gmail label each maps to.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { CANNED_LABEL_CATEGORIES } from "@/lib/label-categories";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GMAIL_LABELS_URL = "https://gmail.googleapis.com/gmail/v1/users/me/labels";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });

  const { data: userCategories } = await supabase
    .from("user_label_categories")
    .select("category_key, gmail_label_id, enabled")
    .eq("user_id", session.user.id);

  const map = (userCategories ?? []).reduce(
    (acc, row) => {
      acc[row.category_key] = { gmail_label_id: row.gmail_label_id, enabled: row.enabled };
      return acc;
    },
    {} as Record<string, { gmail_label_id: string | null; enabled: boolean }>
  );

  let gmailLabels: Array<{ id: string; name: string; type: string }> = [];
  const token = await getGoogleAccessToken(session.user.id);
  if (token) {
    const res = await fetch(GMAIL_LABELS_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = (await res.json()) as { labels?: Array<{ id: string; name: string; type: string }> };
      gmailLabels = data.labels ?? [];
    }
  }

  const categories = CANNED_LABEL_CATEGORIES.map((c) => ({
    ...c,
    enabled: map[c.key]?.enabled ?? true,
    gmail_label_id: map[c.key]?.gmail_label_id ?? null,
  }));

  return NextResponse.json({
    canned: CANNED_LABEL_CATEGORIES,
    categories,
    gmailLabels,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  let body: Array<{ category_key: string; enabled: boolean; gmail_label_id: string | null }>;
  try {
    body = (await req.json()) as Array<{ category_key: string; enabled: boolean; gmail_label_id: string | null }>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validKeys = new Set<string>(CANNED_LABEL_CATEGORIES.map((c) => c.key));
  const rows = body
    .filter((r) => typeof r.category_key === "string" && validKeys.has(r.category_key))
    .map((r) => ({
      user_id: session.user!.id,
      category_key: r.category_key,
      gmail_label_id: r.gmail_label_id || null,
      enabled: !!r.enabled,
      updated_at: new Date().toISOString(),
    }));

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });

  for (const row of rows) {
    await supabase.from("user_label_categories").upsert(row, {
      onConflict: "user_id,category_key",
      ignoreDuplicates: false,
    });
  }

  return NextResponse.json({ ok: true });
}
