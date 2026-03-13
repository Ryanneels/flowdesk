/**
 * GET /api/os/scorecard?company_id= — List metrics with recent entries.
 * POST /api/os/scorecard — Create metric (body: company_id, name, goal_value?, goal_unit?).
 */

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const companyId = new URL(req.url).searchParams.get("company_id");
  if (!companyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data: metrics, error } = await supabase
    .from("scorecard_metrics")
    .select("id, company_id, name, owner_id, goal_value, goal_unit, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const metricIds = (metrics ?? []).map((m) => m.id);
  type Entry = { metric_id: string; week_of: string; actual_value: number | null; is_on_track: boolean | null };
  let entries: Entry[] = [];
  if (metricIds.length > 0) {
    const r = await supabase.from("scorecard_entries").select("metric_id, week_of, actual_value, is_on_track").in("metric_id", metricIds).order("week_of", { ascending: false });
    entries = (r.data ?? []) as Entry[];
  }
  const byMetric = entries.reduce((acc, e) => {
    const mid = e.metric_id;
    if (!acc[mid]) acc[mid] = [];
    acc[mid].push(e);
    return acc;
  }, {} as Record<string, Entry[]>);
  return NextResponse.json({
    metrics: (metrics ?? []).map((m) => ({ ...m, entries: byMetric[m.id] ?? [] })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body: { company_id?: string; name?: string; goal_value?: number; goal_unit?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.company_id || !body.name?.trim()) return NextResponse.json({ error: "company_id and name required" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("scorecard_metrics")
    .insert({
      company_id: body.company_id,
      name: body.name.trim(),
      goal_value: body.goal_value ?? null,
      goal_unit: body.goal_unit ?? null,
      owner_id: session.user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
