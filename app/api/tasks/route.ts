/**
 * GET /api/tasks — List tasks for current user. Query: assignee_id (default = me), source, status, project_id.
 * POST /api/tasks — Create task (body: title, project_id?, source?, priority?, due_date?, ...).
 */

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const assigneeId = searchParams.get("assignee_id") ?? session.user.id;
  const source = searchParams.get("source") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const projectId = searchParams.get("project_id") ?? undefined;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });

  let query = supabase
    .from("tasks")
    .select("id, user_id, title, description, status, priority, due_date, scheduled_start, scheduled_end, source, source_id, project_id, rock_id, calendar_event_id, created_at")
    .eq("assignee_id", assigneeId)
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (source) query = query.eq("source", source);
  if (status) query = query.eq("status", status);
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query.limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body: { title?: string; description?: string; project_id?: string; source?: string; priority?: string; due_date?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: session.user.id,
      assignee_id: session.user.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      project_id: body.project_id || null,
      source: body.source ?? "manual",
      priority: body.priority ?? "p2",
      due_date: body.due_date || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
